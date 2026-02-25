import { ethers } from 'ethers';
import { generateHash } from './api';

// ─── ABI — matches upgraded WorkforceLogger.sol ───────────────────────────────
// logEvent(bytes32 taskId, bytes32 activityHash, bytes32 orgId)
const CONTRACT_ABI = [
    {
        "anonymous": false,
        "inputs": [
            { "indexed": false, "internalType": "bytes32", "name": "taskId", "type": "bytes32" },
            { "indexed": false, "internalType": "bytes32", "name": "activityHash", "type": "bytes32" },
            { "indexed": true, "internalType": "bytes32", "name": "orgId", "type": "bytes32" },
            { "indexed": true, "internalType": "address", "name": "employee", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "TaskLogged",
        "type": "event"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "taskId", "type": "bytes32" },
            { "internalType": "bytes32", "name": "activityHash", "type": "bytes32" },
            { "internalType": "bytes32", "name": "orgId", "type": "bytes32" }
        ],
        "name": "logEvent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// ─── Network ──────────────────────────────────────────────────────────────────
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111

// ─── Wallet Connection ────────────────────────────────────────────────────────
export async function connectWallet() {
    if (!window.ethereum) {
        throw new Error('MetaMask is not installed. Please install MetaMask to use Web3 features.');
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Ensure the user is on Ethereum Sepolia
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: SEPOLIA_CHAIN_ID,
                    chainName: 'Sepolia',
                    nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://rpc.sepolia.org'],
                    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
                }],
            });
        }
    }

    return accounts[0];
}

// ─── On-Chain Logging ─────────────────────────────────────────────────────────
// Security model:
//   1. Frontend sends raw task data to the backend via authenticated API call
//   2. Backend mixes data with ORG_SECRET (server-only env var) → keccak256
//   3. Backend returns only the finished bytes32 hashes — secret never leaves server
//   4. Frontend feeds those hashes into MetaMask → employee signs & submits to chain
export async function logTaskOnChain(taskId, taskDetails) {
    const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

    if (!contractAddress) {
        throw new Error('Smart contract not deployed. Set VITE_CONTRACT_ADDRESS in your environment.');
    }

    // Step 1 — Ask the backend to compute the salted hashes
    const { data: hashes } = await generateHash(taskId, {
        title: taskDetails.title,
        completedBy: taskDetails.completedBy,
        completedAt: taskDetails.completedAt,
        complexity: taskDetails.complexity,
    });

    // hashes = { taskIdBytes32, activityHash, orgIdBytes32 }
    // The ORG_SECRET was used server-side — it never touched this JS file.

    // Step 2 — Connect wallet and submit to blockchain
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

    const tx = await contract.logEvent(
        hashes.taskIdBytes32,
        hashes.activityHash,
        hashes.orgIdBytes32
    );
    const receipt = await tx.wait();

    return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
    };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
export function isWeb3Available() {
    return !!window.ethereum && !!import.meta.env.VITE_CONTRACT_ADDRESS;
}

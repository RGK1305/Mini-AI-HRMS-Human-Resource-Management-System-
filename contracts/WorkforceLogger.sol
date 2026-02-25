// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title WorkforceLogger
 * @notice Immutable on-chain audit trail for RIZE OS task completions.
 * @dev Deployed on Ethereum Sepolia Testnet. Each call to logEvent emits a
 *      TaskLogged event permanently stored in the blockchain log, creating
 *      an immutable, gas-efficient proof-of-work record.
 *
 * Gas Optimisation: taskId and orgId are bytes32 instead of string,
 * cutting calldata costs by ~60%. orgId is indexed so each organisation
 * can filter their own logs directly from the RPC without a database.
 */
contract WorkforceLogger {

    /// @notice Emitted when a task completion is logged on-chain.
    /// @param taskId       keccak256(uuid) of the completed task — fixed 32-byte calldata.
    /// @param activityHash keccak256(salt + JSON payload) — salted for privacy.
    /// @param orgId        keccak256(orgName) — indexed for per-organisation log queries.
    /// @param employee     Wallet address of the employee who completed the task.
    /// @param timestamp    Block timestamp at time of logging.
    event TaskLogged(
        bytes32          taskId,
        bytes32          activityHash,
        bytes32 indexed  orgId,
        address indexed  employee,
        uint256          timestamp
    );

    /// @notice Total number of task logs recorded across all organisations.
    uint256 public logCount;

    /**
     * @notice Log a task completion event on-chain.
     * @param taskId       keccak256 of the task UUID from the RIZE OS database.
     * @param activityHash keccak256(orgSecret + JSON payload) — salted hash for privacy.
     * @param orgId        keccak256 of the organisation name for indexed filtering.
     */
    function logEvent(
        bytes32 taskId,
        bytes32 activityHash,
        bytes32 orgId
    ) external {
        emit TaskLogged(taskId, activityHash, orgId, msg.sender, block.timestamp);
        logCount++;
    }
}

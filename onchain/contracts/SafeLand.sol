// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeLand {
    struct Transaction {
        string tra_id;
        string upi;
        string buyer_id;
        string seller_id;
        string status;
        uint256 agreed_amount;
        uint256 amount_payed;
        bool locked;
        bool exists;
    }

    address public owner;
    mapping(address => bool) public operators;

    mapping(string => Transaction) private transactions;
    mapping(bytes32 => bool) private upiLocked;
    string[] private transactionIds;

    event TransactionCreated(
        string tra_id,
        string upi,
        string buyer_id,
        string seller_id,
        uint256 agreed_amount
    );
    event PaymentUpdated(string tra_id, uint256 amount_payed, uint256 agreed_amount);
    event StatusChanged(string tra_id, string status);
    event UnlockAction(string tra_id, string upi);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == owner || operators[msg.sender], "only operator");
        _;
    }

    modifier transactionExists(string memory tra_id) {
        require(transactions[tra_id].exists, "transaction not found");
        _;
    }

    constructor() {
        owner = msg.sender;
        operators[msg.sender] = true;
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
    }

    function createTransaction(
        string memory tra_id,
        string memory upi,
        string memory buyer_id,
        string memory seller_id,
        uint256 agreed_amount
    ) external onlyOperator {
        require(!transactions[tra_id].exists, "tra_id already exists");
        require(agreed_amount > 0, "agreed_amount must be > 0");

        bytes32 upiKey = keccak256(bytes(upi));
        require(!upiLocked[upiKey], "upi already locked");

        transactions[tra_id] = Transaction({
            tra_id: tra_id,
            upi: upi,
            buyer_id: buyer_id,
            seller_id: seller_id,
            status: "pending",
            agreed_amount: agreed_amount,
            amount_payed: 0,
            locked: true,
            exists: true
        });

        upiLocked[upiKey] = true;
        transactionIds.push(tra_id);

        emit TransactionCreated(tra_id, upi, buyer_id, seller_id, agreed_amount);
    }

    function updateStatus(
        string memory tra_id,
        string memory new_status
    ) external onlyOperator transactionExists(tra_id) {
        Transaction storage txObj = transactions[tra_id];
        require(!_isCompleted(txObj.status), "transaction already completed");

        txObj.status = new_status;
        emit StatusChanged(tra_id, new_status);

        if (_isCompleted(new_status)) {
            txObj.locked = false;
            bytes32 upiKey = keccak256(bytes(txObj.upi));
            upiLocked[upiKey] = false;
            emit UnlockAction(tra_id, txObj.upi);
        }
    }

    function payAmount(
        string memory tra_id,
        uint256 amount
    ) external onlyOperator transactionExists(tra_id) {
        Transaction storage txObj = transactions[tra_id];
        require(!_isCompleted(txObj.status), "transaction already completed");
        require(amount > 0, "amount must be > 0");
        require(txObj.amount_payed + amount <= txObj.agreed_amount, "overpayment not allowed");

        txObj.amount_payed += amount;
        emit PaymentUpdated(tra_id, txObj.amount_payed, txObj.agreed_amount);
    }

    function getTransaction(
        string memory tra_id
    ) external view transactionExists(tra_id) returns (
        string memory,
        string memory,
        string memory,
        string memory,
        string memory,
        uint256,
        uint256,
        bool
    ) {
        Transaction memory txObj = transactions[tra_id];
        return (
            txObj.tra_id,
            txObj.upi,
            txObj.buyer_id,
            txObj.seller_id,
            txObj.status,
            txObj.agreed_amount,
            txObj.amount_payed,
            txObj.locked
        );
    }

    function getTransactionCount() external view returns (uint256) {
        return transactionIds.length;
    }

    function getTransactionIdByIndex(uint256 index) external view returns (string memory) {
        require(index < transactionIds.length, "index out of bounds");
        return transactionIds[index];
    }

    function isUpiLocked(string memory upi) external view returns (bool) {
        bytes32 upiKey = keccak256(bytes(upi));
        return upiLocked[upiKey];
    }

    function _isCompleted(string memory status) internal pure returns (bool) {
        return keccak256(bytes(status)) == keccak256(bytes("completed"));
    }
}

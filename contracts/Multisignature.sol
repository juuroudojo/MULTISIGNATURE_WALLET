// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

contract Multisignature {
    event Deposit(address indexed sender, uint amount);
    event Propose(bytes32 txId);
    event Approve(address validator, bytes32 txId);
    event Revoke(address validator, bytes32 txId);
    event Execute(bytes32 txId);

    uint minQuorum;
    uint validators;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool proposed;
        bool executed;
    }

    mapping(bytes32 => Transaction) transactions;
    mapping(address => mapping(bytes32 => bool)) validated;
    mapping(bytes32 => uint) validations;
    mapping(address => bool) isValidator;

    constructor(uint _minConfirmations, address[] memory addresses) {
        require(
            _minConfirmations <= addresses.length,
            "Quorum can't be greater than the number of validators!"
        );

        minQuorum = _minConfirmations;

        for (uint i = 0; i < addresses.length; i++) {
            address _validator = addresses[i];
            require(!isValidator[_validator], "Already a validator!");

            isValidator[_validator] = true;
            validators += 1;
        }
    }

    modifier onlyContract() {
        require(
            msg.sender == address(this),
            "Can only be accessed by approving transactions!"
        );
        _;
    }

    function propose(address _to, bytes memory _calldata) external payable {
        require(isValidator[msg.sender], "Not a validator!");

        bytes32 _txId = keccak256(abi.encodePacked(msg.sender, _to, _calldata));

        Transaction storage t = transactions[_txId];

        require(t.proposed == false, "Already exists!");

        t.proposed = true;
        t.to = _to;
        t.value = msg.value;
        t.data = _calldata;

        emit Propose(_txId);
    }

    function approve(bytes32 _txId) external {
        require(isValidator[msg.sender], "Not a validator!");

        Transaction memory _t = transactions[_txId];

        require(_t.proposed == true, "Transaction doesn't exist!");
        require(!validated[msg.sender][_txId], "Already approved!");

        validated[msg.sender][_txId] = true;
        validations[_txId] += 1;

        emit Approve(msg.sender, _txId);
    }

    // 2 checks in one? "(Not a validator/Transaction isn't approved)"
    function revoke(bytes32 _txId) external {
        require(isValidator[msg.sender], "Not a validator!");
        require(validated[msg.sender][_txId], "Transaction isn't approved!");

        validated[msg.sender][_txId] = false;
        validations[_txId] -= 1;

        emit Revoke(msg.sender, _txId);
    }

    function executeTransaction(bytes32 _txId) external {
        require(
            validations[_txId] >= minQuorum,
            "Transcations isn't approved!"
        );

        Transaction storage t = transactions[_txId];

        require(!t.executed, "Already executed!");

        t.executed = true;
        (bool sent, ) = t.to.call{value: t.value}(t.data);

        require(sent, "Transaction failed!");

        emit Execute(_txId);
    }

    function addValidator(address _validator) public onlyContract {
        require(!isValidator[_validator], "Already a validator");

        isValidator[_validator] = true;
        validators++;
    }

    function removeValidator(address _validator) public onlyContract {
        require(isValidator[_validator], "Validator doesn't exist");
        require(
            validators - 1 >= minQuorum,
            "Quorum can't be greater than the number of validators!"
        );

        isValidator[_validator] = false;
        validators -= 1;
    }

    function changeQuorum(uint _quorum) public onlyContract {
        require(
            _quorum <= validators,
            "Quorum can't be greater than the number of validators!"
        );
        minQuorum = _quorum;
    }

    receive() external payable {}
}

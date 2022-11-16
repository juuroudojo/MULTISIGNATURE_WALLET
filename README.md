# 𝗗𝗘𝗦𝗖𝗥𝗜𝗣𝗧𝗜𝗢𝗡
- Multisignature wallet providing a safer way of operating your funds
- Quorum and validators are to be set up at the deploy but can also be changed proposing the call to function using a standard protocol
- In order to execute a transaction it first needs to be proposed by one of the validators, then the minQuorum needs to be reached by validators approving the transaction addressing it by its hash, and finally one of the validators needs to call executeTransaction which processes the data of the transaction and function selector (if one is present) and executed the destinguished action

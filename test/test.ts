import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { readFile } from "fs/promises";
var Web3 = require('web3');
var web3 = new Web3('http://localhost:8545');

describe("Bridge", () => {
  let Bridge: ContractFactory;
  let bridge: Contract;
  let Ippo: SignerWithAddress;
  let Takamura: SignerWithAddress;
  let Miyata: SignerWithAddress;
  let Aoki: SignerWithAddress;
  let Validators: string[];
  let WrongValidators: string[];
  const data = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const bata = "0xd2cd96bd0000000000000000000000000000000000000000000000000000000000000003"

  before(async () => {
    [Ippo, Takamura, Miyata, Aoki] = await ethers.getSigners();
    Validators = [Ippo.address, Takamura.address, Miyata.address];
    WrongValidators = [Ippo.address, Ippo.address, Takamura.address, Miyata.address];
  });

  beforeEach(async () => {
    Bridge = await ethers.getContractFactory("Multisignature");
    bridge = await Bridge.deploy(2, Validators);
    await bridge.deployed();
  })

  describe("Deployment", async () => {
    it("Deploy: Should fail to deploy (Incorrect quorum)", async () => {
      expect(Bridge.deploy(4, Validators)).to.be.revertedWith("Quorum can't be greater than the number of validators!");
    })

    it("Deploy: Should fail to deploy (Already a validator!)", async () => {
      expect(Bridge.deploy(1, WrongValidators)).to.be.revertedWith("Already a validator!");
    })
  });

  describe("Propose", async () => {
    it("Should fail to propose", async () => {
      expect(bridge.connect(Aoki).propose(Miyata.address, data)).to.be.revertedWith("Not a validator!");
    })

    it("Should fail to propose(Aleady exists)", async () => {
      await bridge.connect(Takamura).propose(Ippo.address, data);
      expect(bridge.connect(Takamura).propose(Ippo.address, data)).to.be.revertedWith("Already exists!");
    })

    it("Should propose", async () => {
      await bridge.connect(Takamura).propose(Ippo.address, data);
    })
  });

  describe("Approve", async () => {
    // let ABI = await readFile("../ABI/MULT.json");
    // let abi = JSON.parse(ABI.toString());

    it("Should fail to approve(Not a validator!)", async () => {
      expect(bridge.connect(Aoki).approve(data)).to.be.revertedWith("Not a validator!");
    });

    it("Should fail to approve(Transaction doesn't exist!)", async () => {
      expect(bridge.approve(data)).to.be.revertedWith("Transaction doesn't exist!");
    });

    it("Should fail to approve(Already approved!)", async () => {
      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      await bridge.approve(hash);
      expect(bridge.approve(hash)).to.be.revertedWith("Already approved!");
    });

    it("Should approve", async () => {
      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      await bridge.approve(hash);
    });
  });

  describe("Revoke", async () => {
    it("Should fail to revoke(Not a validator!)", async () => {
      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      await bridge.approve(hash);
      expect(bridge.connect(Aoki).revoke(hash)).to.be.revertedWith("Not a validator!");
    })

    it("Should fail to revoke(Transaction isn't approved!)", async () => {
      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      expect(bridge.revoke(hash)).to.be.revertedWith("Transaction isn't approved!");
    })

    it("Should revoke", async () => {
      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      await bridge.approve(hash);
      await bridge.revoke(hash);

      await bridge.approve(hash);
    })
  });

  describe("ExecuteTransaction", async () => {
    it("Should execute transaction", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      await bridge.executeTransaction(hash);
    });

    it("Should fail to execute transaction (Transaction isn't approved!)", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      await bridge.approve(hash);

      expect(bridge.executeTransaction(hash)).to.be.rejectedWith("Transaction isn't approved!");
    })

    it("Should fail to execute transaction (Already executed!)", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      await bridge.connect(Takamura).propose(Ippo.address, data);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes32"],
        [Takamura.address, Ippo.address, data]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      await bridge.executeTransaction(hash);
      expect(bridge.executeTransaction(hash)).to.be.rejectedWith("Already executed!");
    });
  });

  describe("Change settings", async () => {
    it("Should fail to call onlyContract functions", async () => {
      expect(bridge.addValidator(Aoki.address)).to.revertedWith("Can only be accessed by approving transactions!");
    })

    it("Should change quorum", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      const call = web3.eth.abi.encodeFunctionCall({
        name: 'changeQuorum',
        type: 'function',
        inputs: [{
          type: 'uint256',
          name: '_quorum'
        }]
      }, ['3']);

      await bridge.connect(Takamura).propose(bridge.address, call);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Takamura.address, bridge.address, call]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      await bridge.executeTransaction(hash);
    });

    it("Should fail to change quorum", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      const call = web3.eth.abi.encodeFunctionCall({
        name: 'changeQuorum',
        type: 'function',
        inputs: [{
          type: 'uint256',
          name: '_quorum'
        }]
      }, ['8']);

      await bridge.connect(Takamura).propose(bridge.address, call);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Takamura.address, bridge.address, call]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      expect(bridge.executeTransaction(hash)).to.be.revertedWith("Quorum can't be greater than the number of validators!");

    })

    it("Should add validator", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      const call = web3.eth.abi.encodeFunctionCall({
        name: 'addValidator',
        type: 'function',
        inputs: [{
          type: 'address',
          name: '_validator'
        }]
      }, [Aoki.address]);

      await bridge.connect(Takamura).propose(bridge.address, call);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Takamura.address, bridge.address, call]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      await bridge.executeTransaction(hash);

      await bridge.connect(Aoki).propose(bridge.address, data);
    });

    it("Should fail to add validator (Already a validator!)", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      const call = web3.eth.abi.encodeFunctionCall({
        name: 'addValidator',
        type: 'function',
        inputs: [{
          type: 'address',
          name: '_validator'
        }]
      }, [Takamura.address]);

      await bridge.connect(Takamura).propose(bridge.address, call);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Takamura.address, bridge.address, call]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      expect(bridge.executeTransaction(hash)).to.be.revertedWith("Already a validator!");
    })

    it("Should remove validator", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      const call = web3.eth.abi.encodeFunctionCall({
        name: 'removeValidator',
        type: 'function',
        inputs: [{
          type: 'address',
          name: '_validator'
        }]
      }, [Miyata.address]);

      await bridge.connect(Takamura).propose(bridge.address, call);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Takamura.address, bridge.address, call]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      await bridge.executeTransaction(hash);
    })

    it("Should fail to remove validator (Validator doesn't exist!)", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      const call = web3.eth.abi.encodeFunctionCall({
        name: 'removeValidator',
        type: 'function',
        inputs: [{
          type: 'address',
          name: '_validator'
        }]
      }, [Aoki.address]);

      await bridge.connect(Takamura).propose(bridge.address, call);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Takamura.address, bridge.address, call]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      expect(bridge.executeTransaction(hash)).to.be.revertedWith("Validator doesn't exist!");
    });

    it("Should fail to remove Validator(Quorum can't be greater than validators number)", async () => {
      await Ippo.sendTransaction({
        to: bridge.address,
        value: ethers.utils.parseEther("1.0"),
      });

      const call = web3.eth.abi.encodeFunctionCall({
        name: 'removeValidator',
        type: 'function',
        inputs: [{
          type: 'address',
          name: '_validator'
        }]
      }, [Takamura.address]);

      const call1 = web3.eth.abi.encodeFunctionCall({
        name: 'removeValidator',
        type: 'function',
        inputs: [{
          type: 'address',
          name: '_validator'
        }]
      }, [Miyata.address]);

      await bridge.propose(bridge.address, call);
      await bridge.propose(bridge.address, call1);

      const hash = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Ippo.address, bridge.address, call]
      );

      const hash1 = ethers.utils.solidityKeccak256(
        ["address", "address", "bytes"],
        [Ippo.address, bridge.address, call1]
      );

      await bridge.approve(hash);
      await bridge.connect(Miyata).approve(hash);

      await bridge.approve(hash1);
      await bridge.connect(Miyata).approve(hash1);

      await bridge.executeTransaction(hash);
      expect(bridge.executeTransaction(hash1)).to.be.rejectedWith("Quorum can't be greater than the number of validators!");
    })
  });
});

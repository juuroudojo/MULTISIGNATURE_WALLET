import { ethers } from "hardhat";

async function main() {
  const address = ['0x7A34b2f0DA5ea35b5117CaC735e99Ba0e2aCEECD']

  const Wallet = await ethers.getContractFactory("Multisignature");
  const wallet = await Wallet.deploy(1, address);

  await wallet.deployed();

  console.log(`Wallet deployed to ${wallet.address}`);
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

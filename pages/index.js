import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { useEffect, useState, useRef } from 'react'
import { BigNumber, Contract, providers, utils } from "ethers";
import Web3Modal from 'web3modal'
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

export default function Home() {
  const zero = BigNumber.from(0)
  const [walletConnected, setWalletConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  // j
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero)
  const [balanceofAgateCoin, setBalanceOfAgateCoin] = useState(zero)

  // jumlah token yang user ingin mint
  const [tokenAmount, setTokenAmount] = useState(zero)
  // jumlah seluruh token yang sudah di mint
  const [tokensMinted, setTokensMinted] = useState(zero)
  const [isOwner, setIsOwner] = useState(false)
  const web3modalRef = useRef()

  useEffect(() => {
    if (!walletConnected) {
      web3modalRef.current = new Web3Modal({
        network: 'rinkeby',
        providerOptions: {},
        disableInjectedProvider: false
      })
    }

    connectWallet();
    getTotalTokensMinted();
    getBalanceAgateCoinDev();
    getTokensToBeClaimed();

  }, [walletConnected])

  const getProviderOrSigner = async (needSigner) => {
    const provider = await web3modalRef.current.connect()
    const web3Provider = new providers.Web3Provider(provider)

    const { chainId } = await web3Provider.getNetwork()

    if (chainId !== 4) {
      window.alert("Change the network to rinkeby")
      throw new Error("Invalid network")
    }

    if (needSigner) {
      const signer = web3Provider.getSigner()
      return signer
    }

    return web3Provider
  }

  /**
   * getTokensToBeClaimed: cek balance dari token yang dapat diklaim oleh user
   */
  const getTokensToBeClaimed = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer)
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer)

      const userAddress = await signer.getAddress()
      const nftNumber = await nftContract.balanceOf(userAddress)
      if (nftNumber === zero) {
        setTokensToBeClaimed(zero)
      } else {

        let amount = 0
        for (let i = 0; i < nftNumber - 1; i++) {
          console.log('AMOUNT')

          const nftIndex = await nftContract.tokenOfOwnerByIndex(userAddress, i)
          const claimed = await tokenContract.tokenIdsClaimed(nftIndex)
          if (!claimed) {
            await tokenContract.claim(nftIndex)
            amount++
          }
        }

        setTokensToBeClaimed(BigNumber.from(amount))
      }

    } catch (e) {
      console.error(e)
    }
  }

  /**
  * getBalanceAgateCoinDev: Cek jumlah balance yang dimiliki user
  */
  const getBalanceAgateCoinDev = async () => {
    try {
      const provider = await getProviderOrSigner()
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider)
      const signer = await getProviderOrSigner(true)
      const address = await signer.getAddress()
      const balance = await tokenContract.balanceOf(address);
      setBalanceOfAgateCoin(balance)
    } catch (e) {
      console.log(e)
      setBalanceOfAgateCoin(zero)
    }
  }
  /**
  * mintAgateCoinDev: mints `amount` number of tokens to a given address
  */
  const mintAgateCoinDev = async (amount) => {
    try {
      const signer = await getProviderOrSigner(true)
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer)
      const value = amount * 0.01
      const tx = await tokenContract.mint(BigNumber.from(amount), {
        value: utils.parseEther(value.toString())
      })
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert("Sucessfully minted Agate Dev Tokens");
      await getBalanceAgateCoinDev();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err.message);
    }
  }

  /**
   * claimAgateCoinDev : Claim token agate berdasarkan jumlah NFT yang dimiliki
   */
  const claimAgateCoinDev = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer)
      setLoading(true)
      const tx = await tokenContract.claim()
      await tx.wait()
      setLoading(false)
      window.alert('Successfully claim agate token')
      await getBalanceAgateCoinDev();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * getTotalTokensMinted: Dapatkan total token yang sudah dimint
   */
  const getTotalTokensMinted = async () => {
    try {
      const provider = await getProviderOrSigner()
      const contractToken = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider)
      const totalTokensMinted = await contractToken.totalSupply()
      setTokensMinted(totalTokensMinted)
    } catch (e) {
      console.error(e)
    }
  }

  /**
  * getOwner: gets the contract owner by connected address
  */
  const getOwner = async () => {
    try {
      const signer = await getProviderOrSigner(true)
      const userAddress = signer.getAddress()
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, signer)
      const owner = await nftContract.owner()
      if (owner.toLowerCase() == userAddress.toLowerCase()) {
        setIsOwner(true)
      } else {
        setIsOwner(false)
      }
    } catch (e) {
      console.error(e.message)
    }
  }

  /**
 * withdrawCoins: withdraws ether and tokens by calling 
 * the withdraw function in the contract
 */
  const withdrawCoins = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );

      const tx = await tokenContract.withdraw();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await getOwner();
    } catch (err) {
      console.error(err);
    }
  }



  /*
      connectWallet: Connects the MetaMask wallet
    */
  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const renderButton = () => {
    // If we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // if owner is connected, withdrawCoins() is called
    if (walletConnected && isOwner) {
      return (
        <div>
          <button className={styles.button1} onClick={withdrawCoins}>
            Withdraw Coins
          </button>
        </div>
      );
    }
    // If tokens to be claimed are greater than 0, Return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimAgateCoinDev}>
            Claim Tokens
          </button>
        </div>
      );
    }
    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintAgateCoinDev(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>Agate Coin Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Agate Coin Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Agate Coin Devs here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceofAgateCoin)} Agate Coin Devs
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Agate Research And Development
      </footer>
    </div>
  );


}

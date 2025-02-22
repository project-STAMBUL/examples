import {
  getTickIndicesInWordRange,
  getPoolData,
  getAllTicks,
} from './libs/fetcher.js'
import { getProvider } from './libs/providers.js'
import { tickToWordCompressed } from './libs/utils.js'
import { Pool } from '@uniswap/v3-sdk'
import fs from 'fs'
import path from 'path'

// Function to read pool addresses from a file
function readPoolAddresses(filePath: string): string[] {
  const data = fs.readFileSync(filePath, 'utf-8')
  return data.split('\n').filter(Boolean)
}

async function main() {
  const poolAddresses = readPoolAddresses('pools.txt') // Assuming the pool addresses are in a file named pools.txt

  const blockNum = await getProvider().getBlockNumber()
  console.log(blockNum)

  const result: any[] = [] // To store the results for each pool

  // Loop through each pool address and fetch the relevant data
  for (const poolAddress of poolAddresses) {
    try {
      const poolData = await getPoolData(blockNum, poolAddress)

      // Get Word Range
      const tickLower = -887272
      const tickUpper = 887272
      const lowerWord = tickToWordCompressed(tickLower, poolData.tickSpacing)
      const upperWord = tickToWordCompressed(tickUpper, poolData.tickSpacing)

      // Fetch all initialized tickIndices in word range
      const tickIndices = await getTickIndicesInWordRange(
        poolData.address,
        poolData.tickSpacing,
        lowerWord,
        upperWord
      )
      console.log(tickIndices)

      // Fetch all initialized ticks from tickIndices
      const ticks = await getAllTicks(poolData.address, tickIndices)
      console.log(ticks)

      // Initialize Pool with full tick data
      // const fullPool = new Pool(
      //   poolData.tokenA,
      //   poolData.tokenB,
      //   poolData.fee,
      //   poolData.sqrtPriceX96,
      //   poolData.liquidity,
      //   poolData.tick,
      //   ticks
      // )

      // Prepare result object
      const poolResult = {
        poolAddress: poolData.address,
        blockNumber: blockNum,
        slot0: {
          sqrtPriceX96: poolData.sqrtPriceX96.toString(),
          tick: poolData.tick,
        },
        liquidity: poolData.liquidity.toString(),
        tickSpacing: poolData.tickSpacing, 
        tickIndices,
        ticks: ticks.map((tick) => ({
          index: tick.index,
          liquidityGross: tick.liquidityGross.toString(),
          liquidityNet: tick.liquidityNet.toString(),
        })),
      }

      result.push(poolResult)

    } catch (error) {
      console.error(`Error processing pool ${poolAddress}:`)
      
      throw error
    }
  }

  // Save results to a JSON file
  fs.writeFileSync('pool_data.json', JSON.stringify(result, null, 2))
  console.log('Data saved to pool_data.json')
}

await main()

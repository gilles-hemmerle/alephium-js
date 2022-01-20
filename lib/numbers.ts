/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { Transaction } from '../api/api-explorer'

export const MONEY_SYMBOL = ['', 'K', 'M', 'B', 'T']
export const QUINTILLION = 1000000000000000000
export const BILLION = 1000000000

const produceTrailingZeros = (numberOfZeros: number) => {
  let zerosString = ''
  let i = 0
  while (i < numberOfZeros) {
    zerosString += '0'
    i++
  }

  return zerosString
}

export const getNumberOfTrailingZeros = (numberArray: string[]) => {
  let numberOfZeros = 0

  for (let i = numberArray.length - 1; i >= 0; i--) {
    if (numberArray[i] === '0') {
      numberOfZeros++
    } else {
      break
    }
  }

  return numberOfZeros
}

export const removeTrailingZeros = (numString: string, minNumberOfDecimals: number) => {
  const numberArray = numString.split('')

  const numberOfZeros = getNumberOfTrailingZeros(numberArray)

  const numberArrayWithoutTrailingZeros = [...numberArray.slice(0, numberArray.length - numberOfZeros)]

  if (minNumberOfDecimals && numberArrayWithoutTrailingZeros[numberArrayWithoutTrailingZeros.length - 1] === '.')
    numberArrayWithoutTrailingZeros.push(produceTrailingZeros(minNumberOfDecimals))

  return numberArrayWithoutTrailingZeros.join().replace(/,/g, '')
}

export const abbreviateAmount = (baseNum: bigint, showFullPrecision = false, nbOfDecimalsToShow?: number): string => {
  if (baseNum < BigInt(0)) return '???'

  // For abbreviation, we don't need full precision and can work with number
  const alphNum = Number(baseNum) / QUINTILLION
  const minNumberOfDecimals = alphNum < 0.01 ? 3 : 2

  if (showFullPrecision) {
    const decimals = countDecimals(alphNum) === 1 ? 16 : 18 // Avoid precision issue edge case
    return removeTrailingZeros(alphNum.toFixed(decimals), minNumberOfDecimals)
  }

  const tinyAmountsMaxNumberDecimals = 5
  const numberOfDecimalsToDisplay = nbOfDecimalsToShow || minNumberOfDecimals

  if (alphNum < 0.001) {
    return removeTrailingZeros(alphNum.toFixed(tinyAmountsMaxNumberDecimals), minNumberOfDecimals)
  } else if (alphNum < 1000000) {
    return addApostrophe(removeTrailingZeros(alphNum.toFixed(numberOfDecimalsToDisplay), minNumberOfDecimals))
  }

  const tier = alphNum < 1000000000 ? 2 : (alphNum < 1000000000000 ? 3 : 4)
  // get suffix and determine scale
  const suffix = MONEY_SYMBOL[tier]
  const scale = Math.pow(10, tier * 3)

  // Scale the bigNum
  // Here we need to be careful of precision issues
  const scaled = alphNum / scale

  return scaled.toFixed(numberOfDecimalsToDisplay) + suffix
}

export const calAmountDelta = (t: Transaction, id: string) => {
  if (!t.inputs || !t.outputs) {
    throw 'Missing transaction details'
  }

  const inputAmount = t.inputs.reduce<bigint>((acc, input) => {
    return input.amount && input.address === id ? acc + BigInt(input.amount) : acc
  }, BigInt(0))
  const outputAmount = t.outputs.reduce<bigint>((acc, output) => {
    return output.address === id ? acc + BigInt(output.amount) : acc
  }, BigInt(0))

  return outputAmount - inputAmount
}

export const countDecimals = (value: number) => {
  if (Number.isInteger(value)) return 0

  let str = value.toString()
  if (str.startsWith('-')) str = str.substring(1)

  if (str.indexOf('.') !== -1 && str.indexOf('e-') !== -1) {
    return parseInt(str.split('e-')[1]) + str.split('e-')[0].split('.')[1].length || 0
  } else if (str.indexOf('.') !== -1) {
    return str.split('.')[1].length || 0
  }
  return parseInt(str.split('e-')[1]) || 0
}

export const convertToQALPH = (amount: string): bigint => {
  let cleanedAmount = amount

  if (amount.includes('e')) {
    cleanedAmount = convertScientificToFloatString(amount)
  }

  const numberOfDecimals = cleanedAmount.includes('.') ? cleanedAmount.length - 1 - cleanedAmount.indexOf('.') : 0
  const numberOfZerosToAdd = 18 - numberOfDecimals
  return BigInt(`${cleanedAmount.replace('.', '')}${produceTrailingZeros(numberOfZerosToAdd)}`)
}

export const convertScientificToFloatString = (scientificNumber: string): string => {
  let newNumber = scientificNumber
  const scientificNotation = scientificNumber.includes('e-')
    ? 'e-'
    : scientificNumber.includes('e+')
    ? 'e+'
    : scientificNumber.includes('e')
    ? 'e'
    : ''

  if (scientificNumber.startsWith('-')) {
    newNumber = newNumber.substring(1)
  }

  if (scientificNotation === 'e-') {
    const positionOfE = newNumber.indexOf(scientificNotation)
    const moveDotBy = Number(newNumber.substring(positionOfE + scientificNotation.length, newNumber.length))
    const positionOfDot = newNumber.indexOf('.')
    const amountWithoutEandDot = newNumber.substring(0, positionOfE).replace('.', '')
    if (moveDotBy >= positionOfDot) {
      const numberOfZeros = moveDotBy - (positionOfDot > -1 ? positionOfDot : 1)
      newNumber = `0.${produceTrailingZeros(numberOfZeros)}${amountWithoutEandDot}`
    } else {
      const newPositionOfDot = positionOfDot - moveDotBy
      newNumber = `${amountWithoutEandDot.substring(0, newPositionOfDot)}.${amountWithoutEandDot.substring(
        newPositionOfDot
      )}`
    }
  } else if (scientificNotation === 'e+' || scientificNotation === 'e') {
    const positionOfE = newNumber.indexOf(scientificNotation)
    const moveDotBy = Number(newNumber.substring(positionOfE + scientificNotation.length, newNumber.length))
    const numberOfDecimals = newNumber.indexOf('.') > -1 ? positionOfE - newNumber.indexOf('.') - 1 : 0
    const amountWithoutEandDot = newNumber.substring(0, positionOfE).replace('.', '')
    if (numberOfDecimals <= moveDotBy) {
      newNumber = `${amountWithoutEandDot}${produceTrailingZeros(moveDotBy - numberOfDecimals)}`
    } else {
      const positionOfDot = newNumber.indexOf('.')
      const newPositionOfDot = positionOfDot + moveDotBy
      newNumber = `${amountWithoutEandDot.substring(0, newPositionOfDot)}.${amountWithoutEandDot.substring(
        newPositionOfDot
      )}`
    }
  }

  if (scientificNumber.startsWith('-')) {
    newNumber = `-${newNumber}`
  }

  return newNumber
}

const addApostrophe = (numString: string) => {
  const integralPart = numString.split('.')[0]

  if (integralPart.length > 3) {
    return `${integralPart.slice(0, -3)}'${integralPart.slice(-3)}${
      numString.includes('.') ? `.${numString.split('.')[1]}` : ''
    }`
  }

  return numString
}

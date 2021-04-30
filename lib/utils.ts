// Copyright 2018 The Alephium Authors
// This file is part of the alephium project.
//
// The library is free software: you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// The library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public License
// along with the library. If not, see <http://www.gnu.org/licenses/>.

import { HttpResponse } from '../api/Api'
import { PasswordCrypto } from './password-crypto'

const isNode =
  typeof process !== 'undefined' && typeof process.release !== 'undefined' && process.release.name === 'node'

export const signatureEncode = (ec: any, signature: any) => {
  let sNormalized = signature.s
  if (signature.s.cmp(ec.nh) === 1) {
    sNormalized = ec.n.sub(signature.s)
  }

  const r = signature.r.toArrayLike(Uint8Array, 'be', 33).slice(1)
  const s = sNormalized.toArrayLike(Uint8Array, 'be', 33).slice(1)

  const xs = new Uint8Array(r.byteLength + s.byteLength)
  xs.set(new Uint8Array(r), 0)
  xs.set(new Uint8Array(s), r.byteLength)
  return Buffer.from(xs).toString('hex')
}

export const getPasswordCrypto = (): typeof PasswordCrypto => {
  return PasswordCrypto
}

export const Storage = () => {
  if (isNode) {
    const util = require('./utils-node')
    return util.Storage
  } else {
    const util = require('./utils-browser')
    return util.Storage
  }
}

export const getData = async <U>(res: Promise<HttpResponse<U>>): Promise<U> => {
  return (await res).data
}

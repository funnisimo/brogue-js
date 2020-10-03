// As of v1.7.5, Brogue uses this open-source fixed-point square root function
// by Mads A. Elvheim.
// Original file is available here:
// https://gist.github.com/Madsy/1088393/ee0e6c2ca940c25149a08d525d6e713b68636773
// clz() function is taken from a comment by "ruslan-cray" on the same page.

/*
Copyright (c) 2011, Mads A. Elvheim
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the organization nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Mads A. Elvheim BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// #include <stdio.h>
// #include <stdlib.h>
// #include "Rogue.h"

const BIG_BASE = BigInt(FP_BASE);

/* Computing the number of leading zeros in a word. */
function clz(x)
{
    let n;

    /* See "Hacker's Delight" book for more details */
    if (x == 0) return 32;
    n = 0;
    if (x <= 0x0000FFFF) {n = n +16; x = (x <<16) >>> 0;}
    if (x <= 0x00FFFFFF) {n = n + 8; x = (x << 8) >>> 0;}
    if (x <= 0x0FFFFFFF) {n = n + 4; x = (x << 4) >>> 0;}
    if (x <= 0x3FFFFFFF) {n = n + 2; x = (x << 2) >>> 0;}
    if (x <= 0x7FFFFFFF) {n = n + 1;}

    return n;
}


function fp_sqrt(val)
{
    let x;
    let bitpos;
    let v;		// int64

    if(!val)
        return val;

    if (val < 0) {
    	throw new Error('MATH OVERFLOW - limit is 32767 << FP_BASE (about 181 * 181)! Received: ' + val);
    }

    /* clz = count-leading-zeros. bitpos is the position of the most significant bit,
        relative to "1" or 1 << FP_BASE */
    bitpos = FP_BASE - clz(val);

    /* Calculate our first estimate.
        We use the identity 2^a * 2^a = 2^(2*a) or:
         sqrt(2^a) = 2^(a/2)
    */
    if(bitpos > 0) /* val > 1 */
        x = BigInt((1<<FP_BASE) << (bitpos >> 1));
    else if(bitpos < 0) /* 0 < val < 1 */
        x = BigInt((1<<FP_BASE) << ((~bitpos) << 1));
    else /* val == 1 */
        x = BigInt((1<<FP_BASE));

    /* We need to scale val with FP_BASE due to the division.
       Also val /= 2, hence the subtraction of one*/
    v = BigInt(val) << (BIG_BASE - 1n);  // v = val <<  (FP_BASE - 1);

    /* The actual iteration */
    x = (x >> 1n) + (v/x);
    x = (x >> 1n) + (v/x);
    x = (x >> 1n) + (v/x);
    x = (x >> 1n) + (v/x);

    return Number(x);
}

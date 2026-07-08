/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/worldcup_os.json`.
 */
export type WorldcupOs = {
  "address": "Dr4SiPac8YoQbn6TgAeigEegCegjGTFtnEm3tjyiGqJ6",
  "metadata": {
    "name": "worldcupOs",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "relations": [
            "prediction"
          ]
        },
        {
          "name": "prediction",
          "writable": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "escrowAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initializeMarket",
      "discriminator": [
        35,
        35,
        189,
        193,
        155,
        48,
        170,
        203
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "matchId",
          "type": "string"
        },
        {
          "name": "marketType",
          "type": "string"
        }
      ]
    },
    {
      "name": "placePrediction",
      "discriminator": [
        79,
        46,
        195,
        197,
        50,
        91,
        88,
        229
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "prediction",
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "escrowTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "outcomeId",
          "type": "string"
        }
      ]
    },
    {
      "name": "settleMarket",
      "discriminator": [
        193,
        153,
        95,
        216,
        166,
        6,
        144,
        217
      ],
      "accounts": [
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "txoracleProgram"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proofHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "merkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "prediction",
      "discriminator": [
        98,
        127,
        141,
        187,
        218,
        33,
        8,
        14
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "alreadySettled",
      "msg": "Market already settled"
    },
    {
      "code": 6001,
      "name": "alreadyClaimed",
      "msg": "Already claimed"
    },
    {
      "code": 6002,
      "name": "marketNotSettled",
      "msg": "Market not settled"
    }
  ],
  "types": [
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "matchId",
            "type": "string"
          },
          {
            "name": "marketType",
            "type": "string"
          },
          {
            "name": "settled",
            "type": "bool"
          },
          {
            "name": "proofHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "merkleRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "prediction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "outcomeId",
            "type": "string"
          },
          {
            "name": "claimed",
            "type": "bool"
          }
        ]
      }
    }
  ]
};

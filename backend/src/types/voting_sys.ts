/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/voting_sys.json`.
 */
export type VotingSys = {
  "address": "CU8VgpcwS7mLoM1mNjXL9EAc55mDcRFsgPq9SMtfzNFV",
  "metadata": {
    "name": "votingSys",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addToCandidateWhitelist",
      "discriminator": [
        47,
        187,
        164,
        138,
        61,
        111,
        218,
        96
      ],
      "accounts": [
        {
          "name": "electionData",
          "writable": true
        },
        {
          "name": "initiator",
          "signer": true,
          "relations": [
            "electionData"
          ]
        }
      ],
      "args": [
        {
          "name": "candidateName",
          "type": "string"
        }
      ]
    },
    {
      "name": "addToVoterWhitelist",
      "discriminator": [
        246,
        38,
        228,
        128,
        103,
        220,
        118,
        246
      ],
      "accounts": [
        {
          "name": "electionData",
          "writable": true
        },
        {
          "name": "initiator",
          "signer": true,
          "relations": [
            "electionData"
          ]
        }
      ],
      "args": [
        {
          "name": "voterId",
          "type": "string"
        }
      ]
    },
    {
      "name": "changeStage",
      "discriminator": [
        26,
        65,
        114,
        165,
        92,
        184,
        26,
        49
      ],
      "accounts": [
        {
          "name": "electionData",
          "writable": true
        },
        {
          "name": "initiator",
          "signer": true,
          "relations": [
            "electionData"
          ]
        }
      ],
      "args": [
        {
          "name": "newStage",
          "type": {
            "defined": {
              "name": "electionStage"
            }
          }
        }
      ]
    },
    {
      "name": "createElection",
      "discriminator": [
        190,
        206,
        84,
        42,
        83,
        221,
        248,
        249
      ],
      "accounts": [
        {
          "name": "electionData",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
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
          "name": "totalVotes",
          "type": "u64"
        },
        {
          "name": "totalCandidates",
          "type": "u64"
        }
      ]
    },
    {
      "name": "registerCandidate",
      "discriminator": [
        91,
        136,
        96,
        222,
        242,
        4,
        160,
        182
      ],
      "accounts": [
        {
          "name": "candidateData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  110,
                  100,
                  105,
                  100,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "electionData"
              },
              {
                "kind": "arg",
                "path": "candidateName"
              }
            ]
          }
        },
        {
          "name": "electionData",
          "writable": true
        },
        {
          "name": "signer",
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
          "name": "candidateName",
          "type": "string"
        }
      ]
    },
    {
      "name": "removeFromCandidateWhitelist",
      "discriminator": [
        66,
        23,
        51,
        52,
        90,
        243,
        197,
        121
      ],
      "accounts": [
        {
          "name": "electionData",
          "writable": true
        },
        {
          "name": "initiator",
          "signer": true,
          "relations": [
            "electionData"
          ]
        }
      ],
      "args": [
        {
          "name": "candidateName",
          "type": "string"
        }
      ]
    },
    {
      "name": "removeFromVoterWhitelist",
      "discriminator": [
        138,
        188,
        148,
        59,
        20,
        173,
        10,
        46
      ],
      "accounts": [
        {
          "name": "electionData",
          "writable": true
        },
        {
          "name": "initiator",
          "signer": true,
          "relations": [
            "electionData"
          ]
        }
      ],
      "args": [
        {
          "name": "voterId",
          "type": "string"
        }
      ]
    },
    {
      "name": "vote",
      "discriminator": [
        227,
        110,
        155,
        23,
        136,
        126,
        172,
        25
      ],
      "accounts": [
        {
          "name": "candidateData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  110,
                  100,
                  105,
                  100,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "electionData"
              },
              {
                "kind": "arg",
                "path": "candidateName"
              }
            ]
          }
        },
        {
          "name": "electionData",
          "writable": true
        },
        {
          "name": "voterData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "electionData"
              },
              {
                "kind": "arg",
                "path": "voterId"
              }
            ]
          }
        },
        {
          "name": "signer",
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
          "name": "voterId",
          "type": "string"
        },
        {
          "name": "candidateName",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "candidateData",
      "discriminator": [
        242,
        114,
        27,
        163,
        254,
        113,
        100,
        155
      ]
    },
    {
      "name": "electionData",
      "discriminator": [
        83,
        132,
        137,
        223,
        164,
        5,
        215,
        85
      ]
    },
    {
      "name": "voterData",
      "discriminator": [
        188,
        23,
        235,
        160,
        38,
        227,
        251,
        114
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "nameTooLong",
      "msg": "Candidate name is too long."
    },
    {
      "code": 6001,
      "name": "invalidStage",
      "msg": "Invalid election stage for this action."
    },
    {
      "code": 6002,
      "name": "alreadyVoted",
      "msg": "You have already voted."
    },
    {
      "code": 6003,
      "name": "notWhitelisted",
      "msg": "Voter is not whitelisted."
    },
    {
      "code": 6004,
      "name": "alreadyWhitelisted",
      "msg": "Voter is already whitelisted."
    }
  ],
  "types": [
    {
      "name": "candidateData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "votes",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "electionData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stage",
            "type": {
              "defined": {
                "name": "electionStage"
              }
            }
          },
          {
            "name": "initiator",
            "type": "pubkey"
          },
          {
            "name": "totalVotes",
            "type": "u64"
          },
          {
            "name": "totalCandidates",
            "type": "u64"
          },
          {
            "name": "voterWhitelist",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "candidateWhitelist",
            "type": {
              "vec": "string"
            }
          }
        ]
      }
    },
    {
      "name": "electionStage",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "application"
          },
          {
            "name": "voting"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "voterData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "voted",
            "type": "bool"
          }
        ]
      }
    }
  ]
};

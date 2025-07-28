/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/voting_sys.json`.
 */
export type VotingSys = {
  "address": "izmYTzv6KBxCLTjcPqVgJGbrkAz82oTX5tsyKu6CDwQ",
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
      "name": "addauxt",
      "discriminator": [
        252,
        183,
        36,
        146,
        5,
        197,
        106,
        79
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
          "name": "auxt",
          "type": "string"
        }
      ]
    },
    {
      "name": "addcollectorpkc",
      "discriminator": [
        210,
        186,
        43,
        25,
        81,
        9,
        75,
        69
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
          "name": "collectorPkc",
          "type": "string"
        }
      ]
    },
    {
      "name": "addska",
      "discriminator": [
        219,
        251,
        204,
        175,
        40,
        146,
        139,
        51
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
          "name": "ska",
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
      "name": "syncCollectorPkc",
      "discriminator": [
        66,
        123,
        84,
        75,
        114,
        202,
        32,
        198
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
          "name": "collectorPkc",
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
          "name": "voterCi",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
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
            "name": "candidateWhitelist",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "n",
            "type": "string"
          },
          {
            "name": "h",
            "type": "string"
          },
          {
            "name": "ska",
            "type": "string"
          },
          {
            "name": "collectorPkc",
            "type": "string"
          },
          {
            "name": "auxt",
            "type": "string"
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
          },
          {
            "name": "cyphertext",
            "type": "string"
          }
        ]
      }
    }
  ]
};

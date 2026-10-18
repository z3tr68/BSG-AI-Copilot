from typing import cast

from openai.types.responses import ToolParam


BSG_TOOLS = cast(
    list[ToolParam],
    [

        {
            "type": "function",
            "name": "get_available_data",
            "description": (
                "Returns available BSG industries, simulation metadata, "
                "historical years, FIR pages, CIR regions, and COR sections. "
                "Use this when you need to determine what evidence is available."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_practice_data",
            "description": (
                "Retrieve archived BSG practice-round evidence for strategic reference. "
                "Practice data is completely separate from live-game history. Use this "
                "tool, not live FIR/CIR/COR/history tools, whenever retrieving practice "
                "years. Practice evidence may inform live strategy but must never be "
                "merged into the live historical timeline. Start with dataType='summary' "
                "when the available practice years, reports, or decision pages are unknown, "
                "then make targeted requests."
            ),
            "parameters": {
                "type": "object",
                "properties": {

                    "dataType": {
                        "type": "string",
                        "enum": [
                            "summary",
                            "report",
                            "decision_page",
                            "final_leaderboard"
                        ],
                        "description": (
                            "Practice data to retrieve. "
                            "'summary' returns archive inventory and available years; "
                            "'report' retrieves archived FIR, CIR, or COR evidence; "
                            "'decision_page' retrieves an archived practice decision-page snapshot; "
                            "'final_leaderboard' retrieves final archived practice results."
                        )
                    },

                    "year": {
                        "type": ["integer", "null"],
                        "description": (
                            "Practice year. Required for report, decision_page, and "
                            "final_leaderboard. Not required for summary."
                        )
                    },

                    "reportType": {
                        "type": ["string", "null"],
                        "enum": [
                            "FIR",
                            "CIR",
                            "COR",
                            None
                        ],
                        "description": (
                            "Archived report type. Required when dataType='report'. "
                            "Not used for decision_page, final_leaderboard, or summary."
                        )
                    },

                    "page": {
                        "type": ["string", "null"],
                        "description": (
                            "Page identifier. For FIR reports, identifies the FIR page. "
                            "For COR reports, identifies the COR section. "
                            "For decision_page requests, identifies the archived decision page. "
                            "Omit/null to request available FIR pages, COR sections, or "
                            "decision pages where supported."
                        )
                    },

                    "region": {
                        "type": ["string", "null"],
                        "description": (
                            "Region name for CIR or regional COR retrieval. "
                            "For CIR, omit/null to retrieve available regions. "
                            "For COR, omit/null to retrieve the entire requested section."
                        )
                    },

                    "segment": {
                        "type": ["string", "null"],
                        "description": (
                            "CIR market segment. Used with dataType='report' and "
                            "reportType='CIR'. Omit/null to retrieve available segments "
                            "for the requested region."
                        )
                    }
                },

                "required": [
                    "dataType"
                ],

                "additionalProperties": False
            }
        },
        
        {
            "type": "function",
            "name": "get_current_page",
            "description": (
                "Retrieve the latest extracted snapshot for one specific current live "
                "decision page. A specific pageType is required. This tool cannot retrieve "
                "all current decision pages at once. Request additional pages separately "
                "only when they are necessary for the current analysis. "
            ),

            "parameters": {
                "type": "object",

                "properties": {

                    "pageType": {
                        "type": "string",
                        "description": (
                            "Optional decision-page type, such as 'internet_marketing' or "
                            "'compensation_training'. When the task concerns a specific page, "
                            "provide that page type. Omit only when intentionally discovering "
                            "which current-round page snapshots are available."
                            )
                    }
                },

                "required": [
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_rates",
            "description": (
                "Get current BSG interest rates and exchange-rate "
                "impacts affecting the active decision year. Use "
                "when evaluating financing, production location, "
                "cross-region shipments, distribution costs, or "
                "international market economics."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "rateType": {
                        "type": "string",
                        "enum": [
                            "all",
                            "interest",
                            "exchange"
                        ]
                    }
                },
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "search_players_guide",
            "description": (
                "Search the authoritative BSG Player's Guide for documented rules, "
                "mechanics, cause-effect relationships, constraints, and decision "
                "behavior. Use this when reasoning depends on how BSG works and the "
                "relevant rule is not already established by retrieved evidence. "
                "Results contain section IDs and short excerpts; retrieve the full "
                "relevant section with get_players_guide_section when additional "
                "context is needed."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "Natural-language question or mechanics concept to search "
                            "for in the Player's Guide."
                        )
                    }
                },
                "required": [
                    "query"
                ],
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_players_guide_section",
            "description": (
                "Retrieve the full text of a specific authoritative BSG Player's Guide "
                "section identified by search_players_guide. Use this when the search "
                "excerpt does not provide enough context to establish the relevant "
                "rule or mechanic. Do not retrieve sections speculatively."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sectionId": {
                        "type": "string",
                        "description": (
                            "Exact section ID returned by search_players_guide."
                        )
                    }
                },
                "required": [
                    "sectionId"
                ],
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "search_mechanics_knowledge",
            "description": (
                "Search persistent knowledge learned about BSG mechanics from prior "
                "controlled experiments, observed simulator behavior, historical "
                "analysis, user corrections, and retained documented rules. Use this "
                "when prior learned behavior could materially affect the current "
                "reasoning or prevent repeating an earlier experiment. This knowledge "
                "is evidence with provenance, not automatically a universal BSG rule."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "Natural-language description of the BSG mechanic, "
                            "behavior, experiment, or prior finding to retrieve."
                        )
                    },
                    "sourceType": {
                        "type": ["string", "null"],
                        "enum": [
                            "player_guide",
                            "controlled_experiment",
                            "observed_ui",
                            "historical_inference",
                            "user_correction",
                            None
                        ],
                        "description": (
                            "Optional provenance filter. Usually omit unless a "
                            "specific evidence type is needed."
                        )
                    },
                    "confidence": {
                        "type": ["string", "null"],
                        "enum": [
                            "low",
                            "medium",
                            "high",
                            None
                        ],
                        "description": (
                            "Optional confidence filter. Usually omit so relevant "
                            "findings are not hidden."
                        )
                    }
                },
                "required": [
                    "query"
                ],
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "record_mechanics_finding",
            "description": (
                "Persist a compact, evidence-supported finding about BSG mechanics "
                "for use in future decision years. Use only for findings actually "
                "established by a controlled experiment, observed simulator behavior, "
                "supported historical analysis, explicit user correction, or a "
                "documented Player's Guide rule worth retaining. Do not store "
                "speculation, ordinary recommendations, temporary decision state, "
                "or unsupported assumptions. Scope the claim to what the evidence "
                "actually establishes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {
                        "type": "string",
                        "description": (
                            "Stable retrieval category such as internet_marketing, "
                            "production, distribution, private_label, finance, "
                            "facilities, or another concise BSG mechanics topic."
                        )
                    },
                    "claim": {
                        "type": "string",
                        "description": (
                            "Compact statement of what was actually learned. Preserve "
                            "important limits such as year, tested range, conditions, "
                            "or company when the evidence is context-specific. Do not "
                            "generalize beyond the evidence."
                        )
                    },
                    "sourceType": {
                        "type": "string",
                        "enum": [
                            "player_guide",
                            "controlled_experiment",
                            "observed_ui",
                            "historical_inference",
                            "user_correction"
                        ],
                        "description": (
                            "Provenance category describing how the finding was "
                            "established."
                        )
                    },
                    "sourceContext": {
                        "type": "object",
                        "description": (
                            "Compact context needed to interpret the evidence, such "
                            "as phase, year, company, decision page, or Player's Guide "
                            "section ID."
                        ),
                        "additionalProperties": True
                    },
                    "confidence": {
                        "type": "string",
                        "enum": [
                            "low",
                            "medium",
                            "high"
                        ],
                        "description": (
                            "Confidence supported by the evidence. Do not use high "
                            "merely because a finding sounds plausible."
                        )
                    },
                    "evidence": {
                        "type": "string",
                        "description": (
                            "Concise description of the observation, comparison, "
                            "experiment, retrieved data, correction, or documented "
                            "rule supporting the claim. Do not store full page data."
                        )
                    }
                },
                "required": [
                    "topic",
                    "claim",
                    "sourceType",
                    "sourceContext",
                    "confidence",
                    "evidence"
                ],
                "additionalProperties": False
            }
        },

        {
            "type": "function", 
            "name": "get_overall_strategy",
            "description": "Read persistent, versioned multi-year strategy for the current industry.",
            "parameters": {
                "type": "object", 
                "properties": {}, 
                "required": [], 
                "additionalProperties": False
            }
        },
        
        {
            "type": "function", 
            "name": "get_yearly_strategy",
            "description": "Read the strategy for a specific decision year.",
            "parameters": {
                "type": "object", 
                "properties": {
                    "year": {
                        "type": "integer"
                    }
                }, 
                "required": ["year"], 
                "additionalProperties": False
            }
        },

        {
            "type": "function", 
            "name": "get_strategy_history",
            "description": "Read the last N immutable strategy revisions.",
            "parameters": {
                "type": "object", 
                "properties": {
                    "limit": {
                        "type": "integer"
                    }
                }, 
                "required": ["limit"], 
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "save_overall_strategy",
            "description": "Persist a user-approved, version-checked strategy revision; never modifies BSG decisions.",
            "parameters": {
                "type": "object", 
                "properties": {
                    "strategy": {
                        "type": "object", 
                        "additionalProperties": True
                    }, 
                    "expectedVersion": {
                        "type": "integer"
                    }, 
                    "reason": {
                        "type": "string"
                    }
                }, 
                "required": [
                    "strategy", 
                    "expectedVersion", 
                    "reason"
                ], 
                "additionalProperties": False
            }
        },

        {
            "type": "function", 
            "name": "save_yearly_strategy",
            "description": "Persist a user-approved, version-checked strategy revision; never modifies BSG decisions.",
            "parameters": {
                "type": "object", 
                "properties": {
                    "year": {
                        "type": "integer"
                    }, 
                    "strategy": {
                        "type": "object", 
                        "additionalProperties": True
                    }, 
                    "expectedVersion": {
                        "type": "integer"
                    }, 
                    "reason": {
                        "type": "string"
                    }
                }, 
                "required": [
                    "year", 
                    "strategy", 
                    "expectedVersion", 
                    "reason"
                ], 
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_weekly_report",
            "description": (
                "Retrieve a prior live decision-year strategic report. "
                "Use it to maintain strategic continuity across decision years. "
                "If year is omitted, returns the latest available report."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": ["integer", "null"],
                        "description": (
                            "Specific decision year to retrieve. "
                            "Use null to retrieve the latest available report."
                        )
                    }
                },
                "required": ["year"],
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "write_weekly_report",
            "description": (
                "Write or replace the strategic continuity report for a completed "
                "live decision year. Use only when the year's decisions are settled. "
                "Summarize strategy, competitive position, important decisions and "
                "rationale, durable lessons, unresolved questions, and priorities "
                "for the next year. Keep the report concise and evidence-based."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": "integer",
                        "description": "Completed live decision year."
                    },

                    "report": {
                        "type": "object",
                        "properties": {
                            "strategicSummary": {
                                "type": "string",
                                "description": (
                                    "Concise summary of the company's strategy "
                                    "and strategic direction at year end."
                                )
                            },

                            "competitivePosition": {
                                "type": "object",
                                "properties": {
                                    "summary": {
                                        "type": "string"
                                    },
                                    "primaryCompetitors": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    },
                                    "advantages": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    },
                                    "disadvantages": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    }
                                },
                                "required": [
                                    "summary",
                                    "primaryCompetitors",
                                    "advantages",
                                    "disadvantages"
                                ],
                                "additionalProperties": False
                            },

                            "strategy": {
                                "type": "object",
                                "properties": {
                                    "currentApproach": {
                                        "type": "string"
                                    },
                                    "longTermObjective": {
                                        "type": "string"
                                    },
                                    "priorities": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    },
                                    "avoidances": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    }
                                },
                                "required": [
                                    "currentApproach",
                                    "longTermObjective",
                                    "priorities",
                                    "avoidances"
                                ],
                                "additionalProperties": False
                            },

                            "keyDecisions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "page": {
                                            "type": "string"
                                        },
                                        "decision": {
                                            "type": "string"
                                        },
                                        "rationale": {
                                            "type": "string"
                                        }
                                    },
                                    "required": [
                                        "page",
                                        "decision",
                                        "rationale"
                                    ],
                                    "additionalProperties": False
                                }
                            },

                            "performanceGap": {
                                "type": "object",
                                "properties": {
                                    "benchmarkCompany": {
                                        "type": ["string", "null"]
                                    },
                                    "summary": {
                                        "type": "string"
                                    },
                                    "metricsToClose": {
                                        "type": "array",
                                        "items": {
                                            "type": "string"
                                        }
                                    }
                                },
                                "required": [
                                    "benchmarkCompany",
                                    "summary",
                                    "metricsToClose"
                                ],
                                "additionalProperties": False
                            },

                            "experimentsAndLessons": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },

                            "unresolvedQuestions": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            },

                            "nextYearPriorities": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                }
                            }
                        },

                        "required": [
                            "strategicSummary",
                            "competitivePosition",
                            "strategy",
                            "keyDecisions",
                            "performanceGap",
                            "experimentsAndLessons",
                            "unresolvedQuestions",
                            "nextYearPriorities"
                        ],

                        "additionalProperties": False
                    }
                },

                "required": [
                    "year",
                    "report"
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_fir",
            "description": (
                "Retrieve Footwear Industry Report data for a historical year. "
                "Use FIR for industry-wide and company comparison information "
                "including scores, EPS, ROE, stock price, financial statistics, "
                "production benchmarks, operating benchmarks, credit rating, "
                "image rating, celebrity information, and price trends."
                "Use the companies filter whenever the analysis only requires "
                "one or a small number of companies; omit it when industry-wide "
                "evidence is needed."
            ),
            "parameters": {
                "type": "object",

                "properties": {

                    "year": {
                        "type": "integer"
                    },

                    "page": {
                        "type": ["string", "null"],
                        "enum": [
                            "scoreboard",
                            "eps_roe_stock_price",
                            "credit_image_csrc",
                            "bonus_awards",
                            "industry_overview",
                            "financial_statistics",
                            "production_benchmarks",
                            "operating_benchmarks",
                            "celebrity_and_price_trends",
                            None
                        ]
                    },

                    "companies": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string",
                            "enum": [
                                "A", "B", "C", "D",
                                "E", "F", "G", "H",
                                "I", "J", "K", "L"
                            ]
                        },
                        "description": (
                            "Optional company filter. When only specific companies are needed, "
                            "request only those companies to reduce data volume. Omit or use null "
                            "when industry-wide comparison is required."
                        )
                    },

                },

                "required": [
                    "year",
                    "page"
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_cir",
            "description": (
                "Retrieve Competitive Intelligence Report data. "
                "Use this for competitor strategy analysis by year, region, "
                "segment, and company. It contains pricing, S/Q rating, models, "
                "advertising, celebrity appeal, reputation, sales, demand, "
                "market share, retailer support, delivery time, free shipping, "
                "and private-label information."
            ),
            "parameters": {
                "type": "object",

                "properties": {

                    "year": {
                        "type": "integer"
                    },

                    "region": {
                        "type": ["string", "null"],
                        "enum": [
                            "North America",
                            "Europe-Africa",
                            "Asia-Pacific",
                            "Latin America",
                            None
                        ],

                        "description": (
                            "Optional regional filter. Use a geographic region only if "
                            "get_available_data explicitly lists that region for the requested "
                            "COR section. If that section has no listed regions, use null."
                        )
                    },

                    "segment": {
                        "type": ["string", "null"],
                        "enum": [
                            "internet",
                            "wholesale",
                            "private_label",
                            None
                        ]
                    },

                    "company": {
                        "type": ["string", "null"],
                        "description": (
                            "Company letter A through L. "
                            "Use null to retrieve all companies."
                        )
                    }

                },

                "required": [
                    "year",
                    "region",
                    "segment",
                    "company"
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_cor",
            "description": (
                "Retrieve Company Operating Report data for Company H. "
                "Before using a region filter, inspect get_available_data to see "
                "which regions are actually available for that COR section. "
                "If the section lists no regions, set region to null and retrieve "
                "the complete section. Do not infer that a section is regional "
                "from its subject matter."
            ),
            "parameters": {
                "type": "object",

                "properties": {

                    "year": {
                        "type": "integer"
                    },

                    "section": {
                        "type": ["string", "null"],

                        "enum": [
                            "facilities",
                            "production_workforce",
                            "branded_production",
                            "distribution_warehouse",
                            "celebrity_endorsements",
                            "retail_outlets",
                            "internet_marketing",
                            "wholesale_marketing",
                            "administrative_expenses",
                            "private_label_production",
                            "private_label_operations",
                            "internet_market_performance",
                            "wholesale_market_performance",
                            "income_statement",
                            "cash_flow",
                            "balance_sheet",
                            "credit_rating",
                            "interest_rates",
                            "selected_financials",
                            "long_term_loans",
                            "corporate_social_responsibility",
                            "image_rating",
                            None
                        ]
                    },

                    "region": {
                        "type": ["string", "null"],

                        "enum": [
                            "North America",
                            "Europe-Africa",
                            "Asia-Pacific",
                            "Latin America",
                            "Overall",
                            None
                        ]
                    }

                },

                "required": [
                    "year",
                    "section",
                    "region"
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "get_company_history",
            "description": (
                "Retrieve targeted historical information for one BSG company over a "
                "specified year range. Use this to analyze how a company's financial "
                "performance, competitive position, or operating strategy changed over "
                "time. Request only the FIR pages, COR sections, CIR regions, and CIR "
                "segments needed for the analysis to minimize unnecessary data."
            ),
            "parameters": {
                "type": "object",


                "properties": {

                    "company": {
                        "type": "string",
                        "description": "Company letter A through L."
                    },

                    "startYear": {
                        "type": ["integer", "null"]
                    },

                    "endYear": {
                        "type": ["integer", "null"]
                    },

                    "regions": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "description": (
                            "Optional CIR region filter. Use only regions relevant "
                            "to the analysis."
                        )
                    },

                    "segments": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string",
                            "enum": [
                                "internet",
                                "wholesale",
                                "private_label"
                            ]
                        },
                        "description": (
                            "Optional CIR market-segment filter."
                        )
                    },

                    "includeFIR": {
                        "type": ["boolean", "null"],
                        "description": (
                            "Whether FIR data should be included."
                        )
                    },

                    "includeCOR": {
                        "type": ["boolean", "null"],
                        "description": (
                            "Whether COR data should be included."
                        )
                    },

                    "firPages": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "description": (
                            "Optional FIR page filter. Request only FIR pages "
                            "needed for the analysis."
                        )
                    },

                    "corSections": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "description": (
                            "Optional COR section filter. Request only COR sections "
                            "needed for the analysis."
                        )
                    }

                },

                "required": [
                    "company",
                    "startYear",
                    "endYear"
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "compare_companies",
            "description": (
                "Retrieve targeted historical information for one BSG company over a "
                "specified year range. Use this for focused historical comparisons and "
                "trend analysis. Minimize retrieval size: start with the smallest year "
                "range and the fewest FIR pages and COR sections needed to answer the "
                "question. Do not retrieve broad multi-year FIR and COR datasets as an "
                "initial exploratory step. When additional historical context may be "
                "useful, retrieve the most relevant metrics first and expand only when "
                "the returned evidence identifies a specific need. Prefer direct get_fir, "
                "get_cor, or get_cir calls when only one report, section, year, or market "
                "is needed."
            ),
            "parameters": {
                "type": "object",

                "properties": {

                    "companies": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        },
                        "minItems": 2,
                        "description": (
                            "Company letters to compare, such as ['H', 'G']."
                        )
                    },

                    "year": {
                        "type": "integer",
                        "description": (
                            "Historical year to compare."
                        )
                    },

                    "regions": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "description": (
                            "Optional CIR region filter."
                        )
                    },

                    "segments": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string",
                            "enum": [
                                "internet",
                                "wholesale",
                                "private_label"
                            ]
                        },
                        "description": (
                            "Optional CIR market-segment filter."
                        )
                    },

                    "includeFIR": {
                        "type": ["boolean", "null"],
                        "description": (
                            "Whether FIR data should be included."
                        )
                    },

                    "includeCOR": {
                        "type": ["boolean", "null"],
                        "description": (
                            "Whether COR data should be included."
                        )
                    },

                    "firPages": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "description": (
                            "FIR pages to retrieve. Keep this list minimal. Do not request "
                            "multiple FIR pages speculatively; add pages only when each is "
                            "needed for the analysis."
                        )
                    },

                    "corSections": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "description": (
                            "COR sections to retrieve. Keep this list minimal. Some COR sections "
                            "can contain substantial data, so request only sections directly "
                            "needed for the analysis."
                        )
                    }

                },

                "required": [
                    "companies",
                    "year"
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "compare_years",
            "description": (
                "Compare two live BSG historical years for the user's company using a "
                "compact deterministic summary of factual changes and deltas. "
                "Use this as the preferred first-pass tool for cross-year historical "
                "diagnosis before making many separate FIR or COR calls. "
                "The tool reports facts and numeric changes only; interpret strategic "
                "causes, implications, and recommendations yourself. "
                "Use targeted FIR, CIR, or COR retrieval afterward only when additional "
                "detail is needed."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "years": {
                        "type": "array",
                        "description": (
                            "Exactly two live historical years to compare, ordered "
                            "from baseline year to comparison year."
                        ),
                        "items": {
                            "type": "integer"
                        },
                        "minItems": 2,
                        "maxItems": 2
                    },
                    "domains": {
                        "type": "array",
                        "description": (
                            "Optional comparison domains. Omit to use all supported "
                            "domains."
                        ),
                        "items": {
                            "type": "string",
                            "enum": [
                                "scoreboard",
                                "financials",
                                "branded_production",
                                "internet",
                                "wholesale",
                                "inventory"
                            ]
                        },
                        "minItems": 1,
                        "uniqueItems": True
                    }
                },
                "required": [
                    "years"
                ],
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "calculate_change",
            "description": (
                "Calculate absolute and percentage changes between numeric values. "
                "Use this after retrieving BSG data when exact changes or growth "
                "rates are useful for historical trends, competitor comparisons, "
                "or projection-versus-actual analysis. Multiple changes can be "
                "calculated in one call."
            ),
            "parameters": {
                "type": "object",

                "properties": {

                    "calculations": {
                        "type": "array",
                        "minItems": 1,

                        "items": {
                            "type": "object",

                            "properties": {

                                "label": {
                                    "type": ["string", "null"],
                                    "description": (
                                        "Optional label identifying the metric."
                                    )
                                },

                                "startValue": {
                                    "type": "number"
                                },

                                "endValue": {
                                    "type": "number"
                                }

                            },

                            "required": [
                                "startValue",
                                "endValue"
                            ],

                            "additionalProperties": False
                        }
                    }

                },

                "required": [
                    "calculations"
                ],

                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "compare_projection_to_actual",
            "description": (
                "Perform a targeted comparison between one completed decision page's "
                "final projection and selected actual results for the same year. "
                "Use this to investigate a specific projection-versus-actual question, "
                "not to retrieve or reconstruct an entire year's results. Request only "
                "the FIR and COR sections needed for the selected page. For broader "
                "year-end analysis, use targeted FIR, CIR, COR, or historical retrieval "
                "instead of combining many result sections in this tool."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": "integer"
                    },
                    "page": {
                        "type": "string",
                        "description": (
                            "One final decision page to compare against actual Year results. "
                            "Only one decision page may be analyzed per call."
                        )
                    },
                    "firPages": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "maxItems": 3,
                        "description": (
                            "Only FIR pages directly needed to evaluate the selected "
                            "decision page. Request as few as possible."
                        )
                    },
                    "corSections": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        },
                        "maxItems": 3,
                        "description": (
                            "Only COR sections directly needed to evaluate the selected "
                            "decision page. Request as few as possible."
                        )
                    },
                    "regions": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        }
                    },
                    "segments": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string",
                            "enum": [
                                "internet",
                                "wholesale",
                                "private_label"
                            ]
                        }
                    }
                },
                "required": [
                    "year",
                    "page",
                    "firPages",
                    "corSections",
                    "regions",
                    "segments"
                ],
                "additionalProperties": False
            }
        },

        {
            "type": "function",
            "name": "update_session_state",
            "description": (
                "Update persistent workflow memory for the current live BSG "
                "decision session using a controlled action. Use this to start "
                "or complete a page, record current or accepted decisions, set "
                "canonical cross-page dependencies, mark or resolve page "
                "revalidation, track unresolved issues, or record explicit "
                "user corrections. Do not mark a page complete until decisions "
                "have been applied, BSG has recalculated, and the resulting page "
                "has been reread and verified."
            ),

            "parameters": {
                "type": "object",

                "properties": {

                    "action": {
                        "type": "string",

                        "enum": [
                            "start_page",
                            "record_page_decisions",
                            "complete_page",
                            "mark_for_revalidation",
                            "resolve_revalidation",
                            "add_issue",
                            "resolve_issue",
                            "record_correction",
                            "set_page_dependencies"
                        ],

                        "description": (
                            "The controlled session-state operation to perform."
                        )
                    },

                    "payload": {
                        "type": "object",

                        "description": (
                            "Action-specific session data. Use canonical BSG "
                            "decision-page IDs for page and dependencies. "
                            "Dependencies represent structural upstream page "
                            "dependencies used for automatic evidence "
                            "invalidation; they are not notes, instructions, "
                            "rationale, or reminders."
                        ),

                        "properties": {

                            "page": {
                                "type": "string",
                                "description": (
                                    "Canonical BSG decision-page ID."
                                )
                            },

                            "decisions": {
                                "type": "object",
                                "description": (
                                    "Accepted decision values for the page."
                                ),
                                "additionalProperties": True
                            },

                            "keyResults": {
                                "type": "object",
                                "description": (
                                    "Compact important calculated results "
                                    "associated with the accepted decisions."
                                ),
                                "additionalProperties": True
                            },

                            "rationale": {
                                "type": "array",
                                "items": {
                                    "type": "string"
                                },
                                "description": (
                                    "Short reasoning or notes supporting the "
                                    "page state or accepted decisions."
                                )
                            },

                            "dependencies": {
                                "type": "array",

                                "items": {
                                    "type": "string",

                                    "enum": [
                                        "branded_production",
                                        "production_facilities",
                                        "distribution_warehouse",
                                        "internet_marketing",
                                        "wholesale_marketing",
                                        "private_label_operations",
                                        "compensation_training",
                                        "corporate_citizenship",
                                        "celebrity_endorsements",
                                        "finance_cash_flow"
                                    ]
                                },

                                "description": (
                                    "Canonical IDs of upstream BSG decision pages "
                                    "whose accepted decision changes can invalidate "
                                    "this page. Never put instructions, reminders, "
                                    "rationale, or natural-language notes here."
                                )
                            },

                            "reason": {
                                "type": "string"
                            },

                            "id": {
                                "type": "string"
                            },

                            "type": {
                                "type": "string"
                            },

                            "message": {
                                "type": "string"
                            },

                            "topic": {
                                "type": "string"
                            },

                            "field": {
                                "type": "string"
                            },

                            "correction": {
                                "description": (
                                    "Authoritative correction supplied by "
                                    "the user."
                                )
                            },

                            "source": {
                                "type": "string"
                            }

                        },

                        "additionalProperties": False
                    }

                },

                "required": [
                    "action",
                    "payload"
                ],

                "additionalProperties": False
            }
        },

    ]
)
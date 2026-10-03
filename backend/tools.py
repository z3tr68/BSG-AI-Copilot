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
                "Retrieve normalized data from a BSG page "
                "that has been extracted during the current "
                "decision round. Use this tool when current "
                "decisions, projections, or current-round "
                "regional data are needed."
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
                "Retrieve Company H's archived final decision projections and "
                "actual historical results for the same completed BSG year. "
                "Use this to analyze projection accuracy, identify material "
                "variances, and improve assumptions for later decision years. "
                "Request only the decision pages and historical evidence needed "
                "for the analysis."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {
                        "type": "integer"
                    },
                    "pages": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        }
                    },
                    "firPages": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        }
                    },
                    "corSections": {
                        "type": ["array", "null"],
                        "items": {
                            "type": "string"
                        }
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
                    "year"
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
console.log(
    "BSG AI Copilot content.js loaded"
);


//html table parser

function cleanText(text) {
    return text
        .replace(/\s+/g, " ")
        .trim();
}

function getMeaningfulCells(row) {
    const cells = row.querySelectorAll("th, td");

    return Array.from(cells)
        .map(cell => cleanText(cell.innerText))
        .filter(value => value !== "");
}


// ==============================
// SCOREBOARD PARSERS
// ==============================

function parseScoreboard(table) {
    const rows = table.querySelectorAll("tbody tr");
    const companies = [];

    rows.forEach(row => {
        const values = getMeaningfulCells(row);

        if (values.length < 5) {
            return;
        }

        const rank = parseInt(values[0]);
        const company = values[1];

        const investorExpectation = parseFloat(values[2]);
        const bestInIndustry = parseFloat(values[3]);
        const weightedAverage = parseFloat(values[4]);

        if (
            isNaN(rank) ||
            !company ||
            isNaN(investorExpectation) ||
            isNaN(bestInIndustry) ||
            isNaN(weightedAverage)
        ) {
            return;
        }

        companies.push({
            rank,
            company,
            investorExpectation,
            bestInIndustry,
            weightedAverage
        });
    });

    return companies;
}


function parseGameToDateScoreboard(table) {
    const rows = table.querySelectorAll("tbody tr");
    const companies = [];

    rows.forEach(row => {
        const values = getMeaningfulCells(row);

        if (values.length < 7) {
            return;
        }

        const rank = parseInt(values[0]);
        const company = values[1];

        const investorExpectation = parseFloat(values[2]);
        const bestInIndustry = parseFloat(values[3]);
        const weightedAverage = parseFloat(values[4]);
        const bonusPoints = parseFloat(values[5]);
        const overallScore = parseFloat(values[6]);

        if (
            isNaN(rank) ||
            !company ||
            isNaN(investorExpectation) ||
            isNaN(bestInIndustry) ||
            isNaN(weightedAverage) ||
            isNaN(bonusPoints) ||
            isNaN(overallScore)
        ) {
            return;
        }

        companies.push({
            rank,
            company,
            investorExpectation,
            bestInIndustry,
            weightedAverage,
            bonusPoints,
            overallScore
        });
    });

    return companies;
}


// ==============================
// COMPETITIVE EFFORTS PARSER
// ==============================

function parseComparativeCompetitiveEfforts(table) {

    const rows = table.querySelectorAll("tr");

    let region = "";
    let companies = [];
    let currentSegment = "";

    let comparisonCompany = null;

    const segments = {};

    rows.forEach(row => {

        const values = getMeaningfulCells(row);

        if (values.length === 0) {
            return;
        }


        // ==============================
        // REGION + PAGE HEADER
        // ==============================

        const regions = [
            "North America",
            "Europe-Africa",
            "Asia-Pacific",
            "Latin America"
        ];

        if (regions.includes(values[0])) {

            region = values[0];

            // Look for something like:
            // "Co. H vs Ind. Avg."
            const comparisonText = values.find(value =>
                /Co\.\s+[A-L]\s+vs\s+Ind\.\s+Avg\./i.test(value)
            );

            if (comparisonText) {

                const match =
                    comparisonText.match(/Co\.\s+([A-L])/i);

                if (match) {
                    comparisonCompany =
                        match[1].toUpperCase();
                }
            }

            return;
        }


        // ==============================
        // COMPANY HEADER
        // ==============================

        if (
            values.length >= 12 &&
            values[0] === "A" &&
            values[1] === "B" &&
            values[2] === "C"
        ) {

            companies = values.slice(0, 12);

            return;
        }


        // ==============================
        // SEGMENT HEADERS
        // ==============================

        // Important:
        // Do NOT require values.length === 1.
        // Private Label has extra text on its header row.

        if (values[0].includes("INTERNET SEGMENT")) {

            currentSegment = "internet";

            if (!segments.internet) {
                segments.internet = {};
            }

            return;
        }


        if (values[0].includes("WHOLESALE SEGMENT")) {

            currentSegment = "wholesale";

            if (!segments.wholesale) {
                segments.wholesale = {};
            }

            return;
        }


        if (values[0].includes("PRIVATE-LABEL SEGMENT")) {

            currentSegment = "private_label";

            if (!segments.private_label) {
                segments.private_label = {};
            }

            // BSG puts total private-label market
            // information in the second cell.
            if (values.length > 1) {

                segments.private_label.marketSummary =
                    values.slice(1).join(" ");

            }

            return;
        }


        // ==============================
        // IGNORE NOTES
        // ==============================

        if (
            values[0].startsWith("Note:")
        ) {

            if (currentSegment) {

                if (!segments[currentSegment].notes) {
                    segments[currentSegment].notes = [];
                }

                segments[currentSegment].notes.push(
                    values.join(" ")
                );
            }

            return;
        }


        // ==============================
        // METRIC ROWS
        // ==============================

        if (
            currentSegment &&
            companies.length === 12 &&
            values.length >= 13
        ) {

            const metric = values[0];

            const companyValues =
                values.slice(1, 13);


            // Internet and wholesale normally
            // contain industry average columns.
            //
            // Private label normally does not.

            let industryAverage = null;
            let comparisonVsIndustry = null;


            if (currentSegment !== "private_label") {

                industryAverage =
                    values[13] !== undefined
                        ? values[13]
                        : null;

                comparisonVsIndustry =
                    values[14] !== undefined
                        ? values[14]
                        : null;

            }


            const metricData = {
                values: {}
            };


            companies.forEach((company, index) => {

                if (
                    companyValues[index] !== undefined
                ) {

                    metricData.values[company] =
                        companyValues[index];

                }

            });


            if (currentSegment !== "private_label") {

                metricData.industryAverage =
                    industryAverage;

                metricData.comparisonVsIndustry =
                    comparisonVsIndustry;

            }


            segments[currentSegment][metric] =
                metricData;

            return;
        }

    });


    return {

        region,

        companies,

        comparisonCompany,

        segments

    };
}


// ==============================
// GENERIC TABLE PARSER
// ==============================

function parseGenericTable(table) {

    const rows = table.querySelectorAll("tr");

    const tableData = [];

    rows.forEach(row => {

        const values = getMeaningfulCells(row);

        if (values.length > 0) {
            tableData.push(values);
        }

    });

    return tableData;
}


// ==============================
// MAIN EXTRACTION
// ==============================



function parseStrategicGroupMap(table, segment) {

    const rows = table.querySelectorAll("tr");

    const companies = [];

    rows.forEach(row => {

        const values = getMeaningfulCells(row);

        // Expected company row:
        // A, 200, 387, A, 0.058

        if (values.length < 5) {
            return;
        }

        const company = values[0]
            .replace(/"/g, "")
            .trim();

        // Only accept actual BSG companies A-L
        if (!/^[A-L]$/.test(company)) {
            return;
        }

        const productLineBreadth =
            parseFloat(
                values[1].replace(/,/g, "")
            );

        const priceSQIndex =
            parseFloat(
                values[2].replace(/,/g, "")
            );

        const marketShare =
            parseFloat(
                values[4].replace(/,/g, "")
            );

        if (
            isNaN(productLineBreadth) ||
            isNaN(priceSQIndex) ||
            isNaN(marketShare)
        ) {
            return;
        }

        companies.push({
            company,
            productLineBreadth,
            priceSQIndex,
            marketShare,
            marketSharePercent:
                marketShare * 100
        });

    });

    return {
        segment,
        companies
    };
}

function isStrategicGroupMapTable(table) {

    const rows =
        parseGenericTable(table);

    if (rows.length === 0) {
        return false;
    }

    const header = rows[0]
        .join(" ")
        .replace(/"/g, "")
        .toLowerCase();

    return (
        header.includes("company") &&
        header.includes("product line breadth") &&
        header.includes("p/sq rating") &&
        header.includes("market share")
    );
}


// ==============================
// METADATA
// ==============================

function parseMetadataNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number =
        Number(
            String(value)
                .replace(/[$,%★,]/g, "")
                .trim()
        );

    return Number.isFinite(number)
        ? number
        : null;
}


function getInputFromData(
    data,
    id
) {

    return (
        data.inputs || []
    ).find(
        input =>
            input.id === id
    ) || null;

}


function getInputMetadata(
    data,
    id,
    unit = null
) {

    const input =
        getInputFromData(
            data,
            id
        );

    if (!input) {

        return {
            editable: false,
            unit,
            min: null,
            max: null,
            step: null
        };

    }

    return {

        editable:
            !input.disabled &&
            !input.readOnly,

        unit,

        min:
            parseMetadataNumber(
                input.min
            ),

        max:
            parseMetadataNumber(
                input.max
            ),

        step:
            parseMetadataNumber(
                input.step
            )

    };

}


function getSelectMetadata(
    data,
    id,
    unit = null
) {

    const input =
        getInputFromData(
            data,
            id
        );

    return {

        editable:
            Boolean(input) &&
            !input.disabled &&
            !input.readOnly,

        type:
            "select",

        unit,

        currentValue:
            input?.value ?? null,

        selectedText:
            input?.selectedText ?? null,

        options:
            input?.options ?? []

    };

}


// ============================================================
// CORPORATE LOBBY PARSER
// ============================================================

function parseCorporateLobbyPage(data) {
    const scoreboardTable = findTableByCaption(
        data,
        "Scoreboard"
    );

    const interestRatesTable = findTableByCaption(
        data,
        "Interest Rates"
    );

    const exchangeRatesTable = data.tables?.find(table =>
        table.caption
            ?.trim()
            .toLowerCase()
            .startsWith("exchange rates affecting")
    ) ?? null;

    const scoreboard = parseLobbyScoreboard(scoreboardTable);
    const interestRates = parseLobbyInterestRates(interestRatesTable);
    const exchangeRates = parseLobbyExchangeRates(exchangeRatesTable);

    const decisionYear =
        exchangeRates?.affectingYear ??
        extractLobbyDecisionYear(data.pageText);

    const resultsThroughYear =
        scoreboard?.year ??
        (
            Number.isFinite(decisionYear)
                ? decisionYear - 1
                : null
        );

    if (scoreboard) {
        scoreboard.year = resultsThroughYear;
    }

    return {
        page: "corporate_lobby",

        simulation: {
            industry: extractLobbyIndustry(data.pageText),
            decisionYear,
            resultsThroughYear
        },

        scoreboard,
        interestRates,
        exchangeRates
    };
}


// ============================================================
// TABLE HELPERS
// ============================================================

function findTableByCaption(data, caption) {
    if (!Array.isArray(data?.tables)) {
        return null;
    }

    const target = caption
        .trim()
        .toLowerCase();

    return data.tables.find(table =>
        table.caption
            ?.trim()
            .toLowerCase() === target
    ) ?? null;
}


function parseLobbyNumber(value) {
    if (value == null) {
        return null;
    }

    const parsed = Number.parseFloat(
        String(value)
            .replace(/,/g, "")
            .trim()
    );

    return Number.isFinite(parsed)
        ? parsed
        : null;
}


function parseLobbyPercent(value) {
    if (value == null) {
        return null;
    }

    return parseLobbyNumber(
        String(value).replace("%", "")
    );
}


// ============================================================
// SIMULATION METADATA
// ============================================================

function extractLobbyIndustry(pageText) {
    if (!pageText) {
        return null;
    }

    const match = pageText.match(
        /Industry\s+(\d+)/i
    );

    return match
        ? Number(match[1])
        : null;
}


function extractLobbyDecisionYear(pageText) {
    if (!pageText) {
        return null;
    }

    const match = pageText.match(
        /Enter\s+Y(?:ear\s*)?(\d+)\s+decisions/i
    );

    return match
        ? Number(match[1])
        : null;
}


// ============================================================
// SCOREBOARD
// ============================================================

function parseLobbyScoreboard(table) {
    if (!table?.rows?.length) {
        return null;
    }

    const companies = [];

    for (const row of table.rows.slice(1)) {
        if (!Array.isArray(row) || row.length < 7) {
            continue;
        }

        const rawRank = row[0]?.trim() ?? "";

        const rankMatch = rawRank.match(/\d+/);

        companies.push({
            rank: rankMatch
                ? Number(rankMatch[0])
                : null,

            rankLabel: rawRank || null,

            company: row[1]?.trim() || null,

            investorExpectationScore:
                parseLobbyNumber(row[2]),

            bestInIndustryScore:
                parseLobbyNumber(row[3]),

            overallScore:
                parseLobbyNumber(row[4]),

            bonusPoints:
                parseLobbyNumber(row[5]),

            gameToDateScore:
                parseLobbyNumber(row[6])
        });
    }

    return {
        year: null,
        companies
    };
}


// ============================================================
// INTEREST RATES
// ============================================================

function parseLobbyInterestRates(table) {
    if (!table?.rows?.length) {
        return null;
    }

    const header = table.rows[0] ?? [];

    const yearMatch = String(
        header[0] ?? ""
    ).match(/Y(?:EAR)?\s*(\d+)/i);

    const basisYear = yearMatch
        ? Number(yearMatch[1])
        : null;

    const byCreditRating = {};

    for (const row of table.rows.slice(1)) {
        if (!Array.isArray(row) || row.length < 5) {
            continue;
        }

        const rating = row[0]?.trim();

        if (!rating) {
            continue;
        }

        byCreditRating[rating] = {
            oneYearLoanPct:
                parseLobbyPercent(row[1]),

            fiveYearLoanPct:
                parseLobbyPercent(row[2]),

            tenYearLoanPct:
                parseLobbyPercent(row[3]),

            overdraftLoanPct:
                parseLobbyPercent(row[4])
        };
    }

    return {
        creditRatingBasisYear: basisYear,
        affectingYear:
            Number.isFinite(basisYear)
                ? basisYear + 1
                : null,
        byCreditRating
    };
}


// ============================================================
// EXCHANGE RATES
// ============================================================

function parseLobbyExchangeRates(table) {
    if (!table?.rows?.length) {
        return null;
    }

    const caption =
        table.caption ?? "";

    const affectingYearMatch =
        caption.match(/Year\s+(\d+)/i);

    const affectingYear =
        affectingYearMatch
            ? Number(affectingYearMatch[1])
            : null;

    const header = table.rows[0] ?? [];

    const previousYear =
        extractYearFromLobbyHeader(header[1]);

    const currentYear =
        extractYearFromLobbyHeader(header[2]);

    const revenueImpact = {};
    const shippingCostImpact = {};

    let section = null;
    let originFacility = null;

    for (const row of table.rows.slice(1)) {
        if (!Array.isArray(row) || !row.length) {
            continue;
        }

        const label =
            row[0]?.trim() ?? "";

        if (!label) {
            continue;
        }

        // ----------------------------------------
        // Section headers
        // ----------------------------------------

        if (
            label
                .toLowerCase()
                .startsWith(
                    "exchange rate impact on revenues"
                )
        ) {
            section = "revenue";
            originFacility = null;
            continue;
        }

        if (
            label
                .toLowerCase()
                .startsWith(
                    "exchange rate impact on cost"
                )
        ) {
            section = "shipping";
            originFacility = null;
            continue;
        }

        // ----------------------------------------
        // Facility origin headers
        // ----------------------------------------

        const facilityMatch = label.match(
            /^(North America|Europe-Africa|Asia-Pacific|Latin America)\s+Facility\s+to$/i
        );

        if (facilityMatch) {
            originFacility =
                normalizeLobbyRegion(
                    facilityMatch[1]
                );

            if (
                originFacility &&
                !shippingCostImpact[originFacility]
            ) {
                shippingCostImpact[
                    originFacility
                ] = {};
            }

            continue;
        }

        // ----------------------------------------
        // Actual rate rows
        // ----------------------------------------

        if (row.length < 4) {
            continue;
        }

        const region =
            extractLobbyRegionFromLabel(label);

        if (!region) {
            continue;
        }

        const rateData = {
            previousRate:
                parseLobbyNumber(row[1]),

            currentRate:
                parseLobbyNumber(row[2]),

            impactPct:
                parseLobbyPercent(row[3]),

            unit:
                extractLobbyExchangeUnit(label)
        };

        if (section === "revenue") {
            revenueImpact[region] =
                rateData;

            continue;
        }

        if (
            section === "shipping" &&
            originFacility
        ) {
            shippingCostImpact[
                originFacility
            ][region] = rateData;
        }
    }

    return {
        affectingYear,
        previousYear,
        currentYear,

        revenueImpact,
        shippingCostImpact
    };
}


function extractYearFromLobbyHeader(value) {
    if (!value) {
        return null;
    }

    const match =
        String(value).match(
            /Year\s+(\d+)/i
        );

    return match
        ? Number(match[1])
        : null;
}


// ============================================================
// REGION / UNIT HELPERS
// ============================================================

function normalizeLobbyRegion(region) {
    if (!region) {
        return null;
    }

    const normalized =
        region
            .trim()
            .toLowerCase();

    const mapping = {
        "north america": "northAmerica",
        "europe-africa": "europeAfrica",
        "asia-pacific": "asiaPacific",
        "latin america": "latinAmerica"
    };

    return mapping[normalized] ?? null;
}


function extractLobbyRegionFromLabel(label) {
    if (!label) {
        return null;
    }

    const regions = [
        "North America",
        "Europe-Africa",
        "Asia-Pacific",
        "Latin America"
    ];

    for (const region of regions) {
        if (
            label
                .toLowerCase()
                .startsWith(
                    region.toLowerCase()
                )
        ) {
            return normalizeLobbyRegion(region);
        }
    }

    return null;
}


function extractLobbyExchangeUnit(label) {
    if (!label) {
        return null;
    }

    const match =
        label.match(/\(([^)]+)\)/);

    return match
        ? match[1].trim()
        : null;
}

// #region Page Specific Parsers
// ==============================
// PAGE SPECIFIC PARSERS
// ==============================

function parseInternetMarketingPage(
    data
) {

    const inputMap = {};

    data.inputs.forEach(
        input => {

            if (input.id) {

                inputMap[
                    input.id
                ] = input;

            }

        }
    );


    function getNumber(
        id
    ) {

        const input =
            inputMap[id];

        if (!input) {
            return null;
        }

        const number =
            Number(
                String(
                    input.value
                )
                .replace(/,/g, "")
                .replace(/\$/g, "")
                .replace(/%/g, "")
            );

        return Number.isNaN(number)
            ? null
            : number;

    }


    function getSelectedText(
        id
    ) {

        const input =
            inputMap[id];

        if (!input) {
            return null;
        }

        return (
            input.selectedText ??
            input.value ??
            null
        );

    }


    function getBooleanYesNo(
        id
    ) {

        const text =
            getSelectedText(id);

        if (!text) {
            return null;
        }

        const normalized =
            String(text)
                .trim()
                .toLowerCase();

        if (normalized === "yes") {
            return true;
        }

        if (normalized === "no") {
            return false;
        }

        return null;

    }


    function findTableByCaption(
        captionText
    ) {

        return data.tables.find(
            table =>
                String(
                    table.caption || ""
                )
                .toLowerCase()
                .includes(
                    captionText
                        .toLowerCase()
                )
        );

    }


    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const cleaned =
            String(value)
                .replace(/,/g, "")
                .replace(/\$/g, "")
                .replace(/%/g, "")
                .replace(/★/g, "")
                .trim();

        const number =
            Number(cleaned);

        return Number.isNaN(number)
            ? null
            : number;

    }


    function findRowInTables(
    label
        ) {

            for (
                const table of data.tables
            ) {

                if (!table.rows) {
                    continue;
                }

                const row =
                    table.rows.find(
                        row =>
                            row.some(
                                cell =>
                                    String(
                                        cell || ""
                                    )
                                    .trim()
                                    .includes(label)
                            )
                    );

                if (row) {
                    return row;
                }

            }

            return null;
        }

    const marketTable =
        findTableByCaption(
            "Internet Market Shared"
        );


    const profitTable =
        findTableByCaption(
            "Revenue, Cost, & Profit Projections"
        );


    const projections = {

        northAmerica: {},
        europeAfrica: {},
        asiaPacific: {},
        latinAmerica: {}

    };


    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }


    // -----------------------------
    // MARKET SHARE + SALES VOLUME
    // -----------------------------

    if (
        marketTable?.rows
    ) {

        const marketShareRow =
            marketTable.rows.find(
                row =>
                    String(
                        row[0] || ""
                    )
                    .includes(
                        "Internet Market Share"
                    )
            );


        const salesVolumeRow =
            marketTable.rows.find(
                row =>
                    String(
                        row[0] || ""
                    )
                    .includes(
                        "Internet Sales Volume"
                    )
            );


        if (
            marketShareRow &&
            marketShareRow.length >= 9
        ) {

            projections.northAmerica.marketShare = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[1]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[2]
                    )
            };

            projections.europeAfrica.marketShare = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[3]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[4]
                    )
            };

            projections.asiaPacific.marketShare = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[5]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[6]
                    )
            };

            projections.latinAmerica.marketShare = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[7]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[8]
                    )
            };

        }


        if (
            salesVolumeRow &&
            salesVolumeRow.length >= 9
        ) {

            projections.northAmerica.salesVolume = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[1]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[2]
                    )
            };

            projections.europeAfrica.salesVolume = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[3]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[4]
                    )
            };

            projections.asiaPacific.salesVolume = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[5]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[6]
                    )
            };

            projections.latinAmerica.salesVolume = {
                priorYearActual:
                    parseNumber(
                        marketShareRow[7]
                    ),

                currentYearProjected:
                    parseNumber(
                        marketShareRow[8]
                    )
            };

        }

    }


    // -----------------------------
    // OPERATING PROFIT + MARGIN
    // -----------------------------

    if (
        profitTable?.rows
    ) {

        const operatingProfitRow =
            profitTable.rows.find(
                row =>
                    String(
                        row[0] ||
                        row[1] ||
                        ""
                    )
                    .includes(
                        "Operating Profit (Loss)"
                    )
            );


        const operatingMarginRow =
            profitTable.rows.find(
                row =>
                    String(
                        row[0] ||
                        row[1] ||
                        ""
                    )
                    .includes(
                        "Operating Profit Margin"
                    )
            );


        if (
            operatingProfitRow
        ) {

            let offset = 1;

            if (
                operatingProfitRow[0]
                    ?.includes(
                        "Revenue, Cost"
                    )
            ) {
                offset = 2;
            }


            projections.northAmerica.operatingProfit = {
                total:
                    parseNumber(
                        operatingProfitRow[
                            offset
                        ]
                    ),

                perPair:
                    parseNumber(
                        operatingProfitRow[
                            offset + 1
                        ]
                    )
            };

            projections.europeAfrica.operatingProfit = {
                total:
                    parseNumber(
                        operatingProfitRow[
                            offset + 2
                        ]
                    ),

                perPair:
                    parseNumber(
                        operatingProfitRow[
                            offset + 3
                        ]
                    )
            };

            projections.asiaPacific.operatingProfit = {
                total:
                    parseNumber(
                        operatingProfitRow[
                            offset + 4
                        ]
                    ),

                perPair:
                    parseNumber(
                        operatingProfitRow[
                            offset + 5
                        ]
                    )
            };

            projections.latinAmerica.operatingProfit = {
                total:
                    parseNumber(
                        operatingProfitRow[
                            offset + 6
                        ]
                    ),

                perPair:
                    parseNumber(
                        operatingProfitRow[
                            offset + 7
                        ]
                    )
            };

        }


        if (
            operatingMarginRow
        ) {

            const values =
                operatingMarginRow
                    .slice(1)
                    .map(
                        value =>
                            parseNumber(
                                value
                            )
                    )
                    .filter(
                        value =>
                            value !== null
                    );


            if (
                values.length >= 4
            ) {

                projections
                    .northAmerica
                    .operatingMargin =
                    values[0];

                projections
                    .europeAfrica
                    .operatingMargin =
                    values[1];

                projections
                    .asiaPacific
                    .operatingMargin =
                    values[2];

                projections
                    .latinAmerica
                    .operatingMargin =
                    values[3];

            }

        }

    }

    const epsRow =
        findRowInTables(
            "Earnings Per Share"
        );

    const roeRow =
        findRowInTables(
            "Return On Equity"
        );

    const creditRow =
        findRowInTables(
            "Credit Rating"
        );

    const imageRow =
        findRowInTables(
            "Image Rating"
        );

    const revenueRow =
        findRowInTables(
            "Net Revenues ($000s)"
        );

    const netProfitRow =
        findRowInTables(
            "Net Profit($000s)"
        );

    const cashRow =
        findRowInTables(
            "Ending Cash($000s)"
        );


    const overallProjection = {

        earningsPerShare:
            epsRow
                ? parseNumber(
                    epsRow[1]
                )
                : null,

        investorExpectedEPS:
            epsRow
                ? parseNumber(
                    epsRow[2]
                )
                : null,


        returnOnEquity:
            roeRow
                ? parseNumber(
                    roeRow[1]
                )
                : null,

        investorExpectedROE:
            roeRow
                ? parseNumber(
                    roeRow[2]
                )
                : null,


        creditRating:
            creditRow
                ? creditRow[1]
                : null,

        investorExpectedCreditRating:
            creditRow
                ? creditRow[2]
                : null,


        imageRating:
            imageRow
                ? parseNumber(
                    imageRow[1]
                )
                : null,

        investorExpectedImageRating:
            imageRow
                ? parseNumber(
                    imageRow[2]
                )
                : null,


        netRevenues:
            revenueRow
                ? parseNumber(
                    revenueRow[1]
                )
                : null,

        netRevenueChangePercent:
            revenueRow
                ? parseNumber(
                    revenueRow[2]
                )
                : null,


        netProfit:
            netProfitRow
                ? parseNumber(
                    netProfitRow[1]
                )
                : null,

        netProfitChangePercent:
            netProfitRow
                ? parseNumber(
                    netProfitRow[2]
                )
                : null,


        endingCash:
            cashRow
                ? parseNumber(
                    cashRow[1]
                )
                : null,

        endingCashChange:
            cashRow
                ? parseNumber(
                    cashRow[2]
                )
                : null

    };

    const regionConfig = {

        northAmerica: {
            decisions: {
                retailPrice:
                    "entry-input-G208",
                searchAdvertising:
                    "G209-btn",
                freeShipping:
                    "G210-btn"
            },

            assumptions: {
                retailPrice:
                    "G212-btn",
                searchAdvertising:
                    "G213-btn",
                freeShipping:
                    "G214-btn"
            }
        },

        europeAfrica: {
            decisions: {
                retailPrice:
                    "entry-input-G218",
                searchAdvertising:
                    "G219-btn",
                freeShipping:
                    "G220-btn"
            },

            assumptions: {
                retailPrice:
                    "G222-btn",
                searchAdvertising:
                    "G223-btn",
                freeShipping:
                    "G224-btn"
            }
        },

        asiaPacific: {
            decisions: {
                retailPrice:
                    "entry-input-G228",
                searchAdvertising:
                    "G229-btn",
                freeShipping:
                    "G230-btn"
            },

            assumptions: {
                retailPrice:
                    "G232-btn",
                searchAdvertising:
                    "G233-btn",
                freeShipping:
                    "G234-btn"
            }
        },

        latinAmerica: {
            decisions: {
                retailPrice:
                    "entry-input-G238",
                searchAdvertising:
                    "G239-btn",
                freeShipping:
                    "G240-btn"
            },

            assumptions: {
                retailPrice:
                    "G242-btn",
                searchAdvertising:
                    "G243-btn",
                freeShipping:
                    "G244-btn"
            }
        }

    };

    const decisionMetadata = {
        regions: {}
    };


    for (
        const [
            region,
            config
        ] of Object.entries(
            regionConfig
        )
    ) {

        decisionMetadata.regions[region] = {

            retailPrice:
                getInputMetadata(
                    data,
                    config.decisions.retailPrice,
                    "dollars_per_pair"
                ),

            searchAdvertising:
                getSelectMetadata(
                    data,
                    config.decisions.searchAdvertising,
                    "$000s"
                ),

            freeShipping: {
                ...getSelectMetadata(
                    data,
                    config.decisions.freeShipping
                ),

                type:
                    "boolean"
            }

        };

    }

    const assumptionMetadata = {
        competitiveAssumptions: {}
    };


    for (
        const [
            region,
            config
        ] of Object.entries(
            regionConfig
        )
    ) {

        assumptionMetadata
            .competitiveAssumptions[
                region
            ] = {

            classification:
                "projection_assumptions",

            meaning:
                "assumptions_about_competitor_average_actions_used_for_bsg_projections",

            notCompanyDecision:
                true,

            fields: {

                retailPrice:
                    getSelectMetadata(
                        data,
                        config.assumptions.retailPrice,
                        "dollars_per_pair"
                    ),

                searchAdvertising:
                    getSelectMetadata(
                        data,
                        config.assumptions.searchAdvertising,
                        "$000s"
                    ),

                freeShipping: {
                    ...getSelectMetadata(
                        data,
                        config.assumptions.freeShipping
                    ),

                    type:
                        "boolean"
                }

            }

        };

    }

    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        marketProjections: {
            editable: false,
            calculated: true,

            fields: {

                marketShare: {
                    unit: "percent"
                },

                salesVolume: {
                    unit: "000s_pairs"
                }

            }
        },

        financialProjections: {
            editable: false,
            calculated: true,

            fields: {

                operatingProfit: {
                    totalUnit: "$000s",
                    perPairUnit:
                        "dollars_per_pair"
                },

                operatingMargin: {
                    unit: "percent"
                }

            }
        }

    };

    const regions = {};


    for (
        const [
            region,
            config
        ] of Object.entries(
            regionConfig
        )
    ) {

        regions[region] = {

            retailPrice:
                getNumber(
                    config.decisions.retailPrice
                ),

            searchAdvertising:
                getNumber(
                    config.decisions.searchAdvertising
                ),

            freeShipping:
                getBooleanYesNo(
                    config.decisions.freeShipping
                ),

            competitiveAssumptions: {

                retailPrice:
                    getNumber(
                        config.assumptions.retailPrice
                    ),

                searchAdvertising:
                    getNumber(
                        config.assumptions.searchAdvertising
                    ),

                freeShipping:
                    getSelectedText(
                        config.assumptions.freeShipping
                    )

            },

            projections:
                projections[region]

        };

    }

    return {

        pageType:
            "decision",

        decisionType:
            "internet_marketing",

        year,

        overallProjection,

        regions,

        decisionMetadata,

        assumptionMetadata,

        calculatedMetadata

    };
}

function parseWholesaleMarketingPage(
    data
) {

    // ---------------------------------
    // BASIC HELPERS
    // ---------------------------------

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const cleaned =
            String(value)
                .replace(/[$,%★,]/g, "")
                .replace(/\+/g, "")
                .trim();

        if (
            cleaned === "" ||
            cleaned === "-"
        ) {
            return null;
        }

        const number =
            Number(cleaned);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return data.inputs.find(
            input =>
                input.id === id
        ) || null;

    }


    function getNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.value
        );

    }


    function getTableByCaption(
        captionText
    ) {

        const target =
            captionText.toLowerCase();

        return data.tables.find(
            table =>
                (
                    table.caption || ""
                )
                .toLowerCase()
                .includes(target)
        ) || null;

    }


    function getTablesByCaption(
        captionText
    ) {

        const target =
            captionText.toLowerCase();

        return data.tables.filter(
            table =>
                (
                    table.caption || ""
                )
                .toLowerCase()
                .includes(target)
        );

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function getValuesAfterLabel(
        row,
        searchText
    ) {

        if (!row) {
            return [];
        }

        const target =
            searchText.toLowerCase();

        const index =
            row.findIndex(
                cell =>
                    String(cell)
                        .toLowerCase()
                        .includes(target)
            );

        if (index === -1) {
            return [];
        }

        return row
            .slice(index + 1)
            .map(parseNumber)
            .filter(
                value =>
                    value !== null
            );

    }


    function getYearPair(
        values,
        regionIndex
    ) {

        const offset =
            regionIndex * 2;

        return {
            priorYearActual:
                values[offset] ?? null,

            currentYearProjected:
                values[offset + 1] ?? null
        };

    }


    function getFinancialPair(
        values,
        regionIndex
    ) {

        const offset =
            regionIndex * 2;

        return {
            total:
                values[offset] ??
                null,

            perPair:
                values[offset + 1] ??
                null
        };

    }


    // ---------------------------------
    // DETECT ACTIVE YEAR
    // ---------------------------------

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }


    // ---------------------------------
    // INPUT MAP
    // ---------------------------------

    const regionConfig = {

        northAmerica: {
            index: 0,

            decisions: {
                wholesalePrice:
                    "entry-input-G255",

                brandAdvertising:
                    "G256-btn",

                mailInRebate:
                    "G257-btn",

                deliveryTime:
                    "G258-btn",

                retailerSupport:
                    "G259-btn"
            },

            assumptions: {
                sqRating:
                    "G261-btn",

                modelsAvailable:
                    "G262-btn",

                wholesalePrice:
                    "G263-btn",

                brandAdvertising:
                    "G264-btn",

                rebateOffer:
                    "G265-btn",

                deliveryTime:
                    "G266-btn",

                retailerSupport:
                    "G267-btn"
            }
        },


        europeAfrica: {
            index: 1,

            decisions: {
                wholesalePrice:
                    "entry-input-G271",

                brandAdvertising:
                    "G272-btn",

                mailInRebate:
                    "G273-btn",

                deliveryTime:
                    "G274-btn",

                retailerSupport:
                    "G275-btn"
            },

            assumptions: {
                sqRating:
                    "G277-btn",

                modelsAvailable:
                    "G278-btn",

                wholesalePrice:
                    "G279-btn",

                brandAdvertising:
                    "G280-btn",

                rebateOffer:
                    "G281-btn",

                deliveryTime:
                    "G282-btn",

                retailerSupport:
                    "G283-btn"
            }
        },


        asiaPacific: {
            index: 2,

            decisions: {
                wholesalePrice:
                    "entry-input-G287",

                brandAdvertising:
                    "G288-btn",

                mailInRebate:
                    "G289-btn",

                deliveryTime:
                    "G290-btn",

                retailerSupport:
                    "G291-btn"
            },

            assumptions: {
                sqRating:
                    "G293-btn",

                modelsAvailable:
                    "G294-btn",

                wholesalePrice:
                    "G295-btn",

                brandAdvertising:
                    "G296-btn",

                rebateOffer:
                    "G297-btn",

                deliveryTime:
                    "G298-btn",

                retailerSupport:
                    "G299-btn"
            }
        },


        latinAmerica: {
            index: 3,

            decisions: {
                wholesalePrice:
                    "entry-input-G303",

                brandAdvertising:
                    "G304-btn",

                mailInRebate:
                    "G305-btn",

                deliveryTime:
                    "G306-btn",

                retailerSupport:
                    "G307-btn"
            },

            assumptions: {
                sqRating:
                    "G309-btn",

                modelsAvailable:
                    "G310-btn",

                wholesalePrice:
                    "G311-btn",

                brandAdvertising:
                    "G312-btn",

                rebateOffer:
                    "G313-btn",

                deliveryTime:
                    "G314-btn",

                retailerSupport:
                    "G315-btn"
            }
        }

    };

    const decisionMetadata = {
        regions: {}
    };


    for (
        const [
            regionName,
            config
        ] of Object.entries(
            regionConfig
        )
    ) {

        decisionMetadata.regions[regionName] = {

            wholesalePrice:
                getInputMetadata(
                    data,
                    config.decisions.wholesalePrice,
                    "dollars_per_pair"
                ),

            brandAdvertising:
                getSelectMetadata(
                    data,
                    config.decisions.brandAdvertising,
                    "$000s"
                ),

            mailInRebate:
                getSelectMetadata(
                    data,
                    config.decisions.mailInRebate,
                    "dollars_per_pair"
                ),

            deliveryTime:
                getSelectMetadata(
                    data,
                    config.decisions.deliveryTime,
                    "weeks"
                ),

            retailerSupport:
                getSelectMetadata(
                    data,
                    config.decisions.retailerSupport,
                    "dollars_per_outlet"
                )

        };

    }

    const assumptionMetadata = {
        competitiveAssumptions: {}
    };


    for (
        const [
            regionName,
            config
        ] of Object.entries(
            regionConfig
        )
    ) {

        assumptionMetadata
            .competitiveAssumptions[
                regionName
            ] = {

            classification:
                "projection_assumptions",

            meaning:
                "assumptions_about_competitor_average_actions_used_for_bsg_projections",

            notCompanyDecision:
                true,

            fields: {

                sqRating:
                    getSelectMetadata(
                        data,
                        config.assumptions.sqRating,
                        "sq_stars"
                    ),

                modelsAvailable:
                    getSelectMetadata(
                        data,
                        config.assumptions.modelsAvailable,
                        "models"
                    ),

                wholesalePrice:
                    getSelectMetadata(
                        data,
                        config.assumptions.wholesalePrice,
                        "dollars_per_pair"
                    ),

                brandAdvertising:
                    getSelectMetadata(
                        data,
                        config.assumptions.brandAdvertising,
                        "$000s"
                    ),

                rebateOffer:
                    getSelectMetadata(
                        data,
                        config.assumptions.rebateOffer,
                        "dollars_per_pair"
                    ),

                deliveryTime:
                    getSelectMetadata(
                        data,
                        config.assumptions.deliveryTime,
                        "weeks"
                    ),

                retailerSupport:
                    getSelectMetadata(
                        data,
                        config.assumptions.retailerSupport,
                        "dollars_per_outlet"
                    )

            }

        };

    }

    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        productMarketFactors: {
            editable: false,
            calculated: true,

            fields: {
                sqRating: {},
                modelsAvailable: {},
                retailOutlets: {},
                celebrityAppeal: {},
                brandReputation: {}
            }
        },

        marketProjections: {
            editable: false,
            calculated: true,

            fields: {

                marketShare: {
                    unit: "percent"
                },

                availableForSale: {
                    unit: "000s_pairs"
                },

                wholesaleDemand: {
                    unit: "000s_pairs"
                },

                requiredInventory: {
                    unit: "000s_pairs"
                },

                surplusShortfall: {
                    unit: "000s_pairs"
                }

            }
        },

        financialProjections: {
            editable: false,
            calculated: true
        }

    };

    // ---------------------------------
    // WHOLESALE VARIABLES TABLE
    // ---------------------------------

    const variablesTable =
        data.tables.find(
            table =>
                table.tableIndex === 4
        );


    const sqRatingValues =
        getValuesAfterLabel(
            findRow(
                variablesTable,
                "S/Q Rating"
            ),
            "S/Q Rating"
        );


    const modelsAvailableValues =
        getValuesAfterLabel(
            findRow(
                variablesTable,
                "Models Available"
            ),
            "Models Available"
        );


    const retailOutletValues =
        getValuesAfterLabel(
            findRow(
                variablesTable,
                "Retail Outlets"
            ),
            "Retail Outlets"
        );


    const celebrityAppealValues =
        getValuesAfterLabel(
            findRow(
                variablesTable,
                "Celebrity Appeal"
            ),
            "Celebrity Appeal"
        );


    const brandReputationValues =
        getValuesAfterLabel(
            findRow(
                variablesTable,
                "Brand Reputation"
            ),
            "Brand Reputation"
        );


    // ---------------------------------
    // MARKET SHARE / INVENTORY TABLE
    // ---------------------------------

    const marketTable =
        getTableByCaption(
            "Wholesale Market Share & Pairs"
        );


    const marketShareValues =
        getValuesAfterLabel(
            findRow(
                marketTable,
                "total regional sales volume"
            ),
            "Wholesale Market Share"
        );


    const availableForSaleValues =
        getValuesAfterLabel(
            findRow(
                marketTable,
                "Available for Sale"
            ),
            "Available for Sale"
        );


    const wholesaleDemandValues =
        getValuesAfterLabel(
            findRow(
                marketTable,
                "Wholesale Demand"
            ),
            "Wholesale Demand"
        );


    const requiredInventoryValues =
        getValuesAfterLabel(
            findRow(
                marketTable,
                "Required Inventory"
            ),
            "Required Inventory"
        );


    const surplusShortfallValues =
        getValuesAfterLabel(
            findRow(
                marketTable,
                "Surplus (Shortfall)"
            ),
            "Surplus (Shortfall)"
        );


    // ---------------------------------
    // FINANCIAL PROJECTIONS TABLE
    // ---------------------------------

    const financialTables =
        getTablesByCaption(
            "Revenue, Cost, and Margin Projections"
        );


    const financialTable =
        financialTables.find(
            table =>
                table.tableIndex === 6
        ) ||
        financialTables[
            financialTables.length - 1
        ];


    function getFinancialValues(
        label
    ) {

        return getValuesAfterLabel(
            findRow(
                financialTable,
                label
            ),
            label
        );

    }


    const grossRevenueValues =
        getFinancialValues(
            "Gross Wholesale Revenues"
        );


    const exchangeAdjustmentValues =
        getFinancialValues(
            "Exchange Rate Adjustments"
        );


    const netRevenueValues =
        getFinancialValues(
            "Net Wholesale Revenues"
        );


    const costPairsValues =
        getFinancialValues(
            "Cost of Pairs Sold"
        );


    const warehouseExpenseValues =
        getFinancialValues(
            "Warehouse Expenses"
        );


    const marketingExpenseValues =
        getFinancialValues(
            "Marketing Expenses"
        );


    const administrativeExpenseValues =
        getFinancialValues(
            "Administrative Expenses"
        );


    const operatingProfitValues =
        getFinancialValues(
            "Operating Profit"
        );


    const operatingMarginValues =
        getFinancialValues(
            "Operating Profit Margin"
        );

    // ---------------------------------
    // BUILD REGIONS
    // ---------------------------------

    const regions = {};


    for (
        const [
            regionName,
            config
        ]
        of Object.entries(
            regionConfig
        )
    ) {

        const i =
            config.index;


        regions[
            regionName
        ] = {

            // -------------------------
            // CURRENT DECISIONS
            // -------------------------

            wholesalePrice:
                getNumber(
                    config
                        .decisions
                        .wholesalePrice
                ),

            brandAdvertising:
                getNumber(
                    config
                        .decisions
                        .brandAdvertising
                ),

            mailInRebate:
                getNumber(
                    config
                        .decisions
                        .mailInRebate
                ),

            deliveryTime:
                getNumber(
                    config
                        .decisions
                        .deliveryTime
                ),

            retailerSupport:
                getNumber(
                    config
                        .decisions
                        .retailerSupport
                ),


            // -------------------------
            // PRODUCT / MARKET FACTORS
            // -------------------------

            sqRating:
                getYearPair(
                    sqRatingValues,
                    i
                ),

            modelsAvailable:
                getYearPair(
                    modelsAvailableValues,
                    i
                ),

            retailOutlets:
                getYearPair(
                    retailOutletValues,
                    i
                ),

            celebrityAppeal:
                getYearPair(
                    celebrityAppealValues,
                    i
                ),

            brandReputation:
                getYearPair(
                    brandReputationValues,
                    i
                ),


            // -------------------------
            // MARKET PROJECTIONS
            // -------------------------

            marketShare:
                getYearPair(
                    marketShareValues,
                    i
                ),

            availableForSale:
                getYearPair(
                    availableForSaleValues,
                    i
                ),

            wholesaleDemand:
                getYearPair(
                    wholesaleDemandValues,
                    i
                ),

            requiredInventory:
                getYearPair(
                    requiredInventoryValues,
                    i
                ),

            surplusShortfall:
                getYearPair(
                    surplusShortfallValues,
                    i
                ),


            // -------------------------
            // FINANCIAL PROJECTIONS
            // -------------------------

            projections: {

                grossWholesaleRevenue:
                    getFinancialPair(
                        grossRevenueValues,
                        i
                    ),

                exchangeRateAdjustment:
                    getFinancialPair(
                        exchangeAdjustmentValues,
                        i
                    ),

                netWholesaleRevenue:
                    getFinancialPair(
                        netRevenueValues,
                        i
                    ),

                costOfPairsSold:
                    getFinancialPair(
                        costPairsValues,
                        i
                    ),

                warehouseExpenses:
                    getFinancialPair(
                        warehouseExpenseValues,
                        i
                    ),

                marketingExpenses:
                    getFinancialPair(
                        marketingExpenseValues,
                        i
                    ),

                administrativeExpenses:
                    getFinancialPair(
                        administrativeExpenseValues,
                        i
                    ),

                operatingProfit:
                    getFinancialPair(
                        operatingProfitValues,
                        i
                    ),

                operatingMargin:
                    operatingMarginValues[
                        i
                    ] ?? null

            },


            // -------------------------
            // COMPETITIVE ASSUMPTIONS
            // -------------------------

            competitiveAssumptions: {

                sqRating:
                    getNumber(
                        config
                            .assumptions
                            .sqRating
                    ),

                modelsAvailable:
                    getNumber(
                        config
                            .assumptions
                            .modelsAvailable
                    ),

                wholesalePrice:
                    getNumber(
                        config
                            .assumptions
                            .wholesalePrice
                    ),

                brandAdvertising:
                    getNumber(
                        config
                            .assumptions
                            .brandAdvertising
                    ),

                rebateOffer:
                    getNumber(
                        config
                            .assumptions
                            .rebateOffer
                    ),

                deliveryTime:
                    getNumber(
                        config
                            .assumptions
                            .deliveryTime
                    ),

                retailerSupport:
                    getNumber(
                        config
                            .assumptions
                            .retailerSupport
                    )

            }

        };

    }

    // ---------------------------------
    // OVERALL COMPANY PROJECTION
    // ---------------------------------

    const projectionTables =
        getTablesByCaption(
            "Projected EPS"
        );


    const projectionTable =
        projectionTables[
            projectionTables.length - 1
        ];


    function getProjectionValue(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        const index =
            row.findIndex(
                cell =>
                    String(cell)
                        .toLowerCase()
                        .includes(
                            label.toLowerCase()
                        )
            );

        if (
            index === -1 ||
            row[index + 1] ===
                undefined
        ) {
            return null;
        }

        return parseNumber(
            row[index + 1]
        );

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        const index =
            row.findIndex(
                cell =>
                    String(cell)
                        .toLowerCase()
                        .includes(
                            label.toLowerCase()
                        )
            );

        return (
            row[index + 1] ??
            null
        );

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionValue(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionValue(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionValue(
                "Image Rating"
            ),

        netRevenues:
            getProjectionValue(
                "Net Revenues"
            ),

        netProfit:
            getProjectionValue(
                "Net Profit"
            ),

        endingCash:
            getProjectionValue(
                "Ending Cash"
            )

    };


    // ---------------------------------
    // FINAL NORMALIZED RESULT
    // ---------------------------------

    return {

        pageType:
            "decision",

        decisionType:
            "wholesale_marketing",

        year,

        overallProjection,

        regions,

        decisionMetadata,

        assumptionMetadata,

        calculatedMetadata

};

}

function parseFinanceCashFlowPage(
    data
) {

    // =================================
    // BASIC HELPERS
    // =================================

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/,/g, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getNumericAttribute(
        id,
        attribute
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }


        const raw =
            input[attribute];


        if (
            raw === null ||
            raw === undefined ||
            raw === ""
        ) {
            return null;
        }


        return parseNumber(raw);

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.value
        );

    }


    function getSelectedText(
        id
    ) {

        const input =
            getInput(id);

        return (
            input?.selectedText ??
            null
        );

    }


    function getTableByCaption(
        captionText
    ) {

        const target =
            captionText.toLowerCase();

        return (
            data.tables || []
        ).find(
            table =>
                (
                    table.caption || ""
                )
                .toLowerCase()
                .includes(target)
        ) || null;

    }

    function getLimitFromTables(
        pattern
    ) {

        for (
            const table of
            data.tables || []
        ) {

            if (!table?.rows) {
                continue;
            }

            const text =
                table.rows
                    .flat()
                    .join(" ");

            const match =
                text.match(pattern);

            if (match) {
                return parseNumber(
                    match[1]
                );
            }

        }

        return null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function getValueAfterLabel(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {
            return null;
        }

        const index =
            row.findIndex(
                cell =>
                    String(cell)
                        .toLowerCase()
                        .includes(
                            label.toLowerCase()
                        )
            );

        if (index === -1) {
            return null;
        }

        for (
            let i = index + 1;
            i < row.length;
            i++
        ) {

            const value =
                parseNumber(
                    row[i]
                );

            if (
                value !== null
            ) {
                return value;
            }

        }

        return null;

    }


    function getTextAfterLabel(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {
            return null;
        }

        const index =
            row.findIndex(
                cell =>
                    String(cell)
                        .toLowerCase()
                        .includes(
                            label.toLowerCase()
                        )
            );

        if (
            index === -1 ||
            row[index + 1] ===
                undefined
        ) {
            return null;
        }

        return String(
            row[index + 1]
        ).trim();

    }


    // =================================
    // ACTIVE YEAR
    // =================================

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }

    // =================================
    // CURRENT FINANCE DECISIONS
    // =================================

    const decisions = {

        financingSources: {

            oneYearBankLoan:
                getNumber(
                    "entry-input-G497"
                ),

            fiveYearBankLoan:
                getNumber(
                    "entry-input-G498"
                ),

            tenYearBankLoan:
                getNumber(
                    "entry-input-G499"
                ),

            stockIssue:
                getNumber(
                    "entry-input-G501"
                )

        },


        usesExcessCash: {

            earlyRepaymentLoan1:
                getSelectedText(
                    "G505-btn"
                ),

            earlyRepaymentLoan2:
                getSelectedText(
                    "G506-btn"
                ),

            dividendPerShare:
                getNumber(
                    "entry-input-G508"
                ),

            stockRepurchase:
                getNumber(
                    "entry-input-G510"
                )

        }

    };



    const decisionMetadata = {

        financingSources: {

            oneYearBankLoan:
                getInputMetadata(
                    data,
                    "entry-input-G497",
                    "$000s"
                ),

            fiveYearBankLoan:
                getInputMetadata(
                    data,
                    "entry-input-G498",
                    "$000s"
                ),

            tenYearBankLoan:
                getInputMetadata(
                    data,
                    "entry-input-G499",
                    "$000s"
                ),

            stockIssue:
                getInputMetadata(
                    data,
                    "entry-input-G501",
                    "000s_shares"
                )

        },


        usesExcessCash: {

            earlyRepaymentLoan1: {

                editable:
                    Boolean(
                        getInput(
                            "G505-btn"
                        )
                    ),

                type:
                    "select",

                unit:
                    null

            },


            earlyRepaymentLoan2: {

                editable:
                    Boolean(
                        getInput(
                            "G506-btn"
                        )
                    ),

                type:
                    "select",

                unit:
                    null

            },


            dividendPerShare:
                getInputMetadata(
                    data,
                    "entry-input-G508",
                    "dollars_per_share"
                ),


            stockRepurchase:
                getInputMetadata(
                    data,
                    "entry-input-G510",
                    "000s_shares"
                )

        }

    };

    decisionMetadata
        .financingSources
        .stockIssue
        .max =
        getLimitFromTables(
            /Max\.\s*share issue.*?=\s*([\d,.]+)k/i
        );


    decisionMetadata
        .usesExcessCash
        .stockRepurchase
        .max =
        getLimitFromTables(
            /Max\.\s*share repurchase.*?=\s*([\d,.]+)k/i
        );

    // =================================
    // SHARE COUNTS
    // =================================

    const beginningSharesTable =
        (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === 5
        );


    const endingSharesTable =
        (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === 8
        );


    const shares = {

        beginning:
            getValueAfterLabel(
                beginningSharesTable,
                "Shares of stock outstanding"
            ),

        ending:
            getValueAfterLabel(
                endingSharesTable,
                "Shares of stock outstanding"
            )

    };


    // =================================
    // CASH AVAILABLE / INFLOWS
    // =================================

    const cashAvailableTable =
        getTableByCaption(
            "Projected Cash Available"
        );


    const beginningCash =
        getValueAfterLabel(
            cashAvailableTable,
            "Beginning Cash Balance"
        );


    const cashInflows = {

        footwearSales:
            getValueAfterLabel(
                cashAvailableTable,
                "Receipts from Footwear Sales"
            ),

        saleOfUsedEquipment:
            getValueAfterLabel(
                cashAvailableTable,
                "Sale of Used Production Equipment"
            ),

        interestOnPriorCash:
            getValueAfterLabel(
                cashAvailableTable,
                `Interest on Year ${year - 1} Cash Balance`
            ),

        overdraftLoan:
            getValueAfterLabel(
                cashAvailableTable,
                "Loan to Cover Overdraft"
            ),

        instructorCashRefund:
            getValueAfterLabel(
                cashAvailableTable,
                "Cash Refund"
            ),

        totalCashAvailable:
            getValueAfterLabel(
                cashAvailableTable,
                "Total Cash Available"
            )

    };

    cashInflows.oneYearBankLoan =
        decisions
            .financingSources
            .oneYearBankLoan;

    cashInflows.fiveYearBankLoan =
        decisions
            .financingSources
            .fiveYearBankLoan;

    cashInflows.tenYearBankLoan =
        decisions
            .financingSources
            .tenYearBankLoan;

    cashInflows.stockIssue =
            getValueAfterLabel(
                cashAvailableTable,
                "Stock Issue"
            );
    
    // =================================
    // CASH OUTLAYS
    // =================================

    const cashOutlaysTable =
        getTableByCaption(
            "Projected Cash Outlays"
        );


    const cashOutlays = {

        materialsSuppliers:
            getValueAfterLabel(
                cashOutlaysTable,
                "Payments to Materials Suppliers"
            ),

        productionExpenses:
            getValueAfterLabel(
                cashOutlaysTable,
                "Production Expenses"
            ),

        distributionWarehouse:
            getValueAfterLabel(
                cashOutlaysTable,
                "Distribution and Warehouse Expenses"
            ),

        marketingAdministrative:
            getValueAfterLabel(
                cashOutlaysTable,
                "Marketing and Administrative Expenses"
            ),


        capitalOutlays: {

            facilityExpansion:
                getValueAfterLabel(
                    cashOutlaysTable,
                    "Facility Expansion"
                ),

            equipmentPurchases:
                getValueAfterLabel(
                    cashOutlaysTable,
                    "Equipment Purchases"
                ),

            equipmentUpgrades:
                getValueAfterLabel(
                    cashOutlaysTable,
                    "Equipment Upgrade Options"
                ),

            energyEfficiency:
                getValueAfterLabel(
                    cashOutlaysTable,
                    "Energy Efficiency Initiatives"
                )

        },


        loanRepayments: {

            oneYear:
                getValueAfterLabel(
                    cashOutlaysTable,
                    "1-Year Loans"
                ),

            fiveYear:
                getValueAfterLabel(
                    cashOutlaysTable,
                    "5-Year Loans"
                ),

            tenYear:
                getValueAfterLabel(
                    cashOutlaysTable,
                    "10-Year Loans"
                )

        },


        interestPayments:
            getValueAfterLabel(
                cashOutlaysTable,
                "Bank Loans"
            ),

        priorYearOverdraft:
            getValueAfterLabel(
                cashOutlaysTable,
                `Y${year - 1} Overdraft`
            ),

        stockRepurchases:
            getValueAfterLabel(
                cashOutlaysTable,
                "Stock Repurchases"
            ),

        incomeTaxes:
            getValueAfterLabel(
                cashOutlaysTable,
                "Income Tax Payments"
            ),

        dividends:
            getValueAfterLabel(
                cashOutlaysTable,
                "Dividend Payments to Shareholders"
            ),

        charitableContributions:
            getValueAfterLabel(
                cashOutlaysTable,
                "Charitable Contributions"
            ),

        instructorCashFine:
            getValueAfterLabel(
                cashOutlaysTable,
                "Cash Fine"
            ),

        totalCashOutlays:
            getValueAfterLabel(
                cashOutlaysTable,
                "Total Cash Outlays"
            )

    };


    const cashFlowMetadata = {

        beginningCash: {
            editable: false,
            unit: "$000s",
            calculated: true
        },

        inflows: {
            editable: false,
            unit: "$000s",
            calculated: true
        },

        outlays: {
            editable: false,
            unit: "$000s",
            calculated: true
        },

        endingCash: {
            editable: false,
            unit: "$000s",
            calculated: true
        }

    };

    // =================================
    // OTHER FINANCIAL STATISTICS
    // =================================

    const statsTable =
        getTableByCaption(
            "Other Important Financial Statistics"
        );


    function getLastYearProjectedPair(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {

            return {
                lastYear: null,
                projected: null
            };

        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {

            lastYear:
                values[0] ??
                null,

            projected:
                values[1] ??
                null

        };

    }

    // =================================
    // CREDIT RATING METRICS
    // =================================

    const creditTable =
        getTableByCaption(
            "Performance on Credit Rating Measures"
        );


    const creditMetrics = {

        interestCoverageRatio:
            getLastYearProjectedPair(
                creditTable,
                "Interest Coverage Ratio"
            ),

        debtToAssetsRatio:
            getLastYearProjectedPair(
                creditTable,
                "Debt to Assets Ratio"
            ),

        riskOfDefault: {

            lastYear:
                null,

            projected:
                null

        }

    };


    const defaultRiskRow =
        findRow(
            creditTable,
            "Risk of Default"
        );


    if (
        defaultRiskRow
    ) {

        creditMetrics
            .riskOfDefault
            .lastYear =
            defaultRiskRow[1] ??
            null;

        creditMetrics
            .riskOfDefault
            .projected =
            defaultRiskRow[2] ??
            null;

    }


    const financialStatistics = {

        overdraftInterestRate:
            getLastYearProjectedPair(
                statsTable,
                "Interest Rate Paid on Overdraft Loans"
            ),

        cashBalanceInterestRate:
            getLastYearProjectedPair(
                statsTable,
                "Interest Rate Received on Cash Balances"
            ),

        shareholderEquity:
            getLastYearProjectedPair(
                statsTable,
                "Shareholder Equity"
            )

    };

    // =================================
    // OVERALL COMPANY PROJECTION
    // =================================

    const projectionTable =
        (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === 3
        );


    function getProjectionNumber(
        label
    ) {

        return getValueAfterLabel(
            projectionTable,
            label
        );

    }


    function getProjectionText(
        label
    ) {

        return getTextAfterLabel(
            projectionTable,
            label
        );

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };


    // =================================
    // FINAL NORMALIZED RESULT
    // =================================

    return {

        pageType:
            "decision",

        decisionType:
            "finance_cash_flow",

        year,

        overallProjection,

        decisions,

        decisionMetadata,

        shares,

        cashFlow: {

            beginningCash,

            inflows:
                cashInflows,

            outlays:
                cashOutlays,

            endingCash:
                overallProjection
                    .endingCash

        },

        cashFlowMetadata,

        financialStatistics,

        creditMetrics

    };

}

function parseBrandedProductionPage(
    data
) {

    // =================================
    // BASIC HELPERS
    // =================================

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/[$,%★,]/g, "")
                .replace(/\bmil\.\b/gi, "")
                .replace(/\bpairs?\b/gi, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.value
        );

    }


    function getSelectedNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.selectedText ??
            input.value
        );

    }


    function getTableByIndex(
        index
    ) {

        return (
            data.tables || []
        ).find(
            table =>
                table.tableIndex ===
                index
        ) || null;

    }


    function getTableByCaption(
        captionText
    ) {

        const target =
            captionText.toLowerCase();

        return (
            data.tables || []
        ).find(
            table =>
                (
                    table.caption || ""
                )
                .toLowerCase()
                .includes(target)
        ) || null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function getNumbersFromRow(
        row
    ) {

        if (!row) {
            return [];
        }

        return row
            .slice(1)
            .map(parseNumber)
            .filter(
                value =>
                    value !== null
            );

    }


    function getFourFacilityValues(
        table,
        label
    ) {

        const values =
            getNumbersFromRow(
                findRow(
                    table,
                    label
                )
            );

        return {
            northAmerica:
                values[0] ?? null,

            europeAfrica:
                values[1] ?? null,

            asiaPacific:
                values[2] ?? null,

            latinAmerica:
                values[3] ?? null
        };

    }


    function getCostPairs(
        table,
        label
    ) {

        const values =
            getNumbersFromRow(
                findRow(
                    table,
                    label
                )
            );

        return {

            northAmerica: {
                total:
                    values[0] ?? null,
                perPair:
                    values[1] ?? null
            },

            europeAfrica: {
                total:
                    values[2] ?? null,
                perPair:
                    values[3] ?? null
            },

            asiaPacific: {
                total:
                    values[4] ?? null,
                perPair:
                    values[5] ?? null
            },

            latinAmerica: {
                total:
                    values[6] ?? null,
                perPair:
                    values[7] ?? null
            }

        };

    }

    // =================================
    // ACTIVE YEAR
    // =================================

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }

    // =================================
    // FACILITY DECISION INPUTS
    // =================================

    const facilityConfig = {

        northAmerica: {
            superiorMaterials:
                "G55-btn",
            models:
                "G56-btn",
            styling:
                "G57-btn",
            tqm:
                "G58-btn",
            pairs:
                "entry-input-G60"
        },

        europeAfrica: {
            superiorMaterials:
                "G64-btn",
            models:
                "G65-btn",
            styling:
                "G66-btn",
            tqm:
                "G67-btn",
            pairs:
                "entry-input-G69"
        },

        asiaPacific: {
            superiorMaterials:
                "G73-btn",
            models:
                "G74-btn",
            styling:
                "G75-btn",
            tqm:
                "G76-btn",
            pairs:
                "entry-input-G78"
        },

        latinAmerica: {
            superiorMaterials:
                "G82-btn",
            models:
                "G83-btn",
            styling:
                "G84-btn",
            tqm:
                "G85-btn",
            pairs:
                "entry-input-G87"
        }

    };


    const decisionInputs = {};

    for (
        const [
            region,
            config
        ] of Object.entries(
            facilityConfig
        )
    ) {

        decisionInputs[region] = {

            superiorMaterialsPct:
                getSelectedNumber(
                    config.superiorMaterials
                ),

            modelsStyles:
                getSelectedNumber(
                    config.models
                ),

            enhancedStyling:
                getSelectedNumber(
                    config.styling
                ),

            tqmSixSigma:
                getSelectedNumber(
                    config.tqm
                ),

            pairsToManufacture:
                getNumber(
                    config.pairs
                )

        };

    }

    const decisionMetadata = {

        facilities: {}

    };


    for (
        const [
            region,
            config
        ] of Object.entries(
            facilityConfig
        )
    ) {

        decisionMetadata
            .facilities[region] = {

            standardMaterialsPct: {
                editable: false,
                calculated: true,
                unit: "percent",

                relationship:
                    "complement_of_superior_materials_pct"
            },

            superiorMaterialsPct:
                getSelectMetadata(
                    data,
                    config.superiorMaterials,
                    "percent"
                ),

            modelsStyles:
                getSelectMetadata(
                    data,
                    config.models,
                    "models"
                ),

            enhancedStyling:
                getSelectMetadata(
                    data,
                    config.styling,
                    "dollars_per_pair"
                ),

            tqmSixSigma:
                getSelectMetadata(
                    data,
                    config.tqm,
                    "dollars_per_pair"
                ),

            pairsToManufacture:
                getInputMetadata(
                    data,
                    config.pairs,
                    "000s_pairs"
                )

        };

    }

    // =================================
    // PRODUCTION SPEC TABLE
    // =================================

    const specsTable =
        getTableByIndex(4);


    const standardMaterials =
        getFourFacilityValues(
            specsTable,
            "Standard Materials %"
        );

    // =================================
    // QUALITY / REJECT PROJECTIONS
    // =================================

    const qualityTable =
        getTableByIndex(5);


    const projectedSQ =
        getFourFacilityValues(
            qualityTable,
            "Projected S/Q Rating"
        );


    const projectedRejectRate =
        getFourFacilityValues(
            qualityTable,
            "Projected Reject Rate"
        );

    // =================================
    // MAXIMUM FACILITY CAPABILITY
    // =================================

    const maxCapabilityTable =
        getTableByIndex(6);


    const maximumWithoutOvertime =
        getFourFacilityValues(
            maxCapabilityTable,
            "Without Overtime"
        );


    const maximumWithOvertime =
        getFourFacilityValues(
            maxCapabilityTable,
            "Maximum Overtime"
        );

    // =================================
    // CURRENT PRODUCTION
    // =================================

    const productionTable =
        getTableByIndex(7);


    const regularCapacity =
        getFourFacilityValues(
            productionTable,
            "Regular-Time"
        );


    const overtimeCapacity =
        getFourFacilityValues(
            productionTable,
            "Overtime (20% maximum)"
        );


    const totalCapacity =
        getFourFacilityValues(
            productionTable,
            "Total Production Capability"
        );


    const regularProduction =
        getFourFacilityValues(
            productionTable,
            "Regular-Time Production"
        );


    const overtimeProduction =
        getFourFacilityValues(
            productionTable,
            "Overtime Production"
        );


    const netBrandedProduction =
        getFourFacilityValues(
            productionTable,
            "Net Branded Production"
        );


    const privateLabelCapacityRemaining =
        getFourFacilityValues(
            productionTable,
            "Production Capability Remaining for Private-Label"
        );
    
    function getRejectedPairs(
        table
    ) {

        const row =
            findRow(
                table,
                "Rejected Pairs"
            );

        const result = {
            northAmerica: {
                pairs: null,
                rate: null
            },
            europeAfrica: {
                pairs: null,
                rate: null
            },
            asiaPacific: {
                pairs: null,
                rate: null
            },
            latinAmerica: {
                pairs: null,
                rate: null
            }
        };

        if (!row) {
            return result;
        }

        const regions = [
            "northAmerica",
            "europeAfrica",
            "asiaPacific",
            "latinAmerica"
        ];

        row
            .slice(1, 5)
            .forEach(
                (
                    cell,
                    index
                ) => {

                    const text =
                        String(cell);

                    const pairMatch =
                        text.match(
                            /^([\d,]+)/
                        );

                    const rateMatch =
                        text.match(
                            /\(([\d.]+)%\)/
                        );

                    result[
                        regions[index]
                    ] = {

                        pairs:
                            pairMatch
                                ? Number(
                                    pairMatch[1]
                                        .replace(
                                            /,/g,
                                            ""
                                        )
                                )
                                : null,

                        rate:
                            rateMatch
                                ? Number(
                                    rateMatch[1]
                                )
                                : null

                    };

                }
            );

        return result;

    }


    const rejectedPairs =
        getRejectedPairs(
            productionTable
        );

    // =================================
    // REJECT COSTS
    // =================================

    const rejectCostTable =
        getTableByIndex(8);


    const rejectCost =
        getCostPairs(
            rejectCostTable,
            "Cost of Rejected Pairs"
        );

    // =================================
    // PRODUCTION COSTS
    // =================================

    const costTable =
        getTableByCaption(
            "Costs Associated with the Production of Branded Footwear"
        );


    const materialCost =
        getCostPairs(
            costTable,
            "Materials Cost"
        );


    const laborCost =
        getCostPairs(
            costTable,
            "Labor Cost"
        );


    const stylingCost =
        getCostPairs(
            costTable,
            "Enhanced Styling/Features"
        );


    const tqmCost =
        getCostPairs(
            costTable,
            "TQM / 6-Sigma Quality Program"
        );


    const setupCost =
        getCostPairs(
            costTable,
            "Production Run Set-Up"
        );


    const maintenanceCost =
        getCostPairs(
            costTable,
            "Maintenance"
        );


    const depreciationCost =
        getCostPairs(
            costTable,
            "Depreciation"
        );


    const totalProductionCost =
        getCostPairs(
            costTable,
            "Total Branded Production Cost"
        );

    // =================================
    // MATERIAL PRICE ASSUMPTIONS
    // =================================

    const materialPriceAssumptions = {

        standardMaterials:
            getSelectedNumber(
                "G91-btn"
            ),

        superiorMaterials:
            getSelectedNumber(
                "G92-btn"
            )

    };


    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        quality: {
            editable: false,
            calculated: true,

            fields: {
                projectedSQ: {
                    unit: "sq_stars"
                },

                projectedRejectRate: {
                    unit: "percent"
                }
            }
        },

        capacity: {
            editable: false,
            calculated: true,
            unit: "000s_pairs"
        },

        production: {
            editable: false,
            calculated: true,
            unit: "000s_pairs",

            fields: {
                regular: {
                    meaning:
                        "bsg_calculated_regular_time_production"
                },

                overtime: {
                    meaning:
                        "bsg_calculated_overtime_production"
                },

                rejected: {
                    meaning:
                        "bsg_calculated_rejected_pairs"
                },

                netBranded: {
                    meaning:
                        "bsg_calculated_saleable_branded_production"
                }
            }
        },

        costs: {
            editable: false,
            calculated: true
        },

        totalPairsScheduled: {
            editable: false,
            calculated: true,
            unit: "000s_pairs"
        }

    };
    
    const assumptionMetadata = {

        materialPriceAssumptions: {

            standardMaterials: {
                ...getSelectMetadata(
                    "G91-btn"
                ),

                classification:
                    "projection_assumption"
            },

            superiorMaterials: {
                ...getSelectMetadata(
                    "G92-btn"
                ),

                classification:
                    "projection_assumption"
            }

        }

    };

    // =================================
    // BUILD FACILITY OBJECTS
    // =================================

    const facilities = {};

    const regions = [
        "northAmerica",
        "europeAfrica",
        "asiaPacific",
        "latinAmerica"
    ];


    for (
        const region of regions
    ) {

        facilities[region] = {

            decisions: {

                standardMaterialsPct:
                    standardMaterials[
                        region
                    ],

                superiorMaterialsPct:
                    decisionInputs[
                        region
                    ]
                    .superiorMaterialsPct,

                modelsStyles:
                    decisionInputs[
                        region
                    ]
                    .modelsStyles,

                enhancedStyling:
                    decisionInputs[
                        region
                    ]
                    .enhancedStyling,

                tqmSixSigma:
                    decisionInputs[
                        region
                    ]
                    .tqmSixSigma,

                pairsToManufacture:
                    decisionInputs[
                        region
                    ]
                    .pairsToManufacture

            },


            quality: {

                projectedSQ:
                    projectedSQ[
                        region
                    ],

                projectedRejectRate:
                    projectedRejectRate[
                        region
                    ]

            },


            capacity: {

                maximumWithoutOvertime:
                    maximumWithoutOvertime[
                        region
                    ],

                maximumWithOvertime:
                    maximumWithOvertime[
                        region
                    ],

                regular:
                    regularCapacity[
                        region
                    ],

                overtime:
                    overtimeCapacity[
                        region
                    ],

                total:
                    totalCapacity[
                        region
                    ],

                remainingForPrivateLabel:
                    privateLabelCapacityRemaining[
                        region
                    ]

            },


            production: {

                regular:
                    regularProduction[
                        region
                    ],

                overtime:
                    overtimeProduction[
                        region
                    ],

                rejected:
                    rejectedPairs[
                        region
                    ],

                netBranded:
                    netBrandedProduction[
                        region
                    ]

            },


            costs: {

                materials:
                    materialCost[
                        region
                    ],

                labor:
                    laborCost[
                        region
                    ],

                enhancedStyling:
                    stylingCost[
                        region
                    ],

                tqmSixSigma:
                    tqmCost[
                        region
                    ],

                setup:
                    setupCost[
                        region
                    ],

                maintenance:
                    maintenanceCost[
                        region
                    ],

                depreciation:
                    depreciationCost[
                        region
                    ],

                rejectedPairs:
                    rejectCost[
                        region
                    ],

                total:
                    totalProductionCost[
                        region
                    ]

            }

        };

    }

    // =================================
    // OVERALL PROJECTION
    // =================================

    const projectionTable =
        getTableByIndex(3);


    function getProjectionNumber(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        return parseNumber(
            row[1]
        );

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        return row[1] ?? null;

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };

    // =================================
    // TOTAL PRODUCTION SCHEDULE
    // =================================

    let totalPairsScheduled = null;

    const scheduledRow =
        findRow(
            productionTable,
            "Pairs to be Manufactured"
        );

    if (
        scheduledRow?.[0]
    ) {

        const match =
            String(
                scheduledRow[0]
            ).match(
                /Total\s*=\s*([\d,]+)/i
            );

        if (match) {

            totalPairsScheduled =
                Number(
                    match[1]
                        .replace(
                            /,/g,
                            ""
                        )
                );

        }

    }

    // =================================
    // FINAL NORMALIZED RESULT
    // =================================

    return {

        pageType:
            "decision",

        decisionType:
            "branded_production",

        year,

        overallProjection,

        materialPriceAssumptions,

        totalPairsScheduled,

        facilities,

        decisionMetadata,

        calculatedMetadata,

        assumptionMetadata

    };

}

function parseProductionFacilitiesPage(
    data
) {

    // =================================
    // BASIC HELPERS
    // =================================

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/[$,%★,]/g, "")
                .replace(/\bpairs?\b/gi, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getSelectedNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.selectedText ??
            input.value
        );

    }


    function getImprovementState(
        id
    ) {
        const input =
            getInput(id);

        // A missing control means this upgrade was
        // purchased in a prior year and is now complete.
        if (!input) {
            return {
                selected: null,
                status: "completed",
                editable: false
            };
        }

        const text =
            String(
                input.selectedText ??
                input.value ??
                ""
            )
            .trim()
            .toLowerCase();

        if (text === "yes") {
            return {
                selected: true,
                status: "selected",
                editable: true
            };
        }

        if (text === "no") {
            return {
                selected: false,
                status: "available",
                editable: true
            };
        }

        return {
            selected: null,
            status: "unknown",
            editable: false
        };
    }


    function getTableByIndex(
        index
    ) {

        return (
            data.tables || []
        ).find(
            table =>
                table.tableIndex ===
                index
        ) || null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function getFourFacilityValues(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {
            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };
        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {
            northAmerica:
                values[0] ?? null,

            europeAfrica:
                values[1] ?? null,

            asiaPacific:
                values[2] ?? null,

            latinAmerica:
                values[3] ?? null
        };

    }

    // =================================
    // ACTIVE YEAR
    // =================================

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }

    // =================================
    // INPUT CONFIGURATION
    // =================================

    const facilityConfig = {

        northAmerica: {

            newEquipment:
                "G103-btn",

            refurbishedEquipment:
                "G104-btn",

            equipmentSold:
                "G106-btn",

            optionA:
                "G108-btn",

            optionB:
                "G109-btn",

            optionC:
                "G110-btn",

            optionD:
                "G111-btn",

            additionalSpace:
                "G113-btn"

        },


        europeAfrica: {

            newEquipment:
                "G117-btn",

            refurbishedEquipment:
                "G118-btn",

            equipmentSold:
                "G120-btn",

            optionA:
                "G122-btn",

            optionB:
                "G123-btn",

            optionC:
                "G124-btn",

            optionD:
                "G125-btn",

            additionalSpace:
                "G127-btn"

        },


        asiaPacific: {

            newEquipment:
                "G131-btn",

            refurbishedEquipment:
                "G132-btn",

            equipmentSold:
                "G134-btn",

            optionA:
                "G136-btn",

            optionB:
                "G137-btn",

            optionC:
                "G138-btn",

            optionD:
                "G139-btn",

            additionalSpace:
                "G141-btn"

        },


        latinAmerica: {

            newEquipment:
                "G145-btn",

            refurbishedEquipment:
                "G146-btn",

            equipmentSold:
                "G148-btn",

            optionA:
                "G150-btn",

            optionB:
                "G151-btn",

            optionC:
                "G152-btn",

            optionD:
                "G153-btn",

            additionalSpace:
                "G155-btn"

        }

    };

    const decisionMetadata = {

        facilities: {}

    };


    for (
        const [
            region,
            config
        ] of Object.entries(
            facilityConfig
        )
    ) {

        decisionMetadata
            .facilities[
                region
            ] = {

            equipment: {

                purchaseNew:
                    getSelectMetadata(
                        data,
                        config.newEquipment,
                        "000s_pairs_capacity"
                    ),

                purchaseRefurbished:
                    getSelectMetadata(
                        data,
                        config.refurbishedEquipment,
                        "000s_pairs_capacity"
                    ),

                sellExisting:
                    getSelectMetadata(
                        data,
                        config.equipmentSold,
                        "000s_pairs_capacity"
                    )

            },


            improvements: {

                selectionType:
                    "single",

                maxSelections:
                    1,

                options: {

                    optionA: {
                        ...getSelectMetadata(
                            data,
                            config.optionA
                        ),

                        ...getImprovementState(
                            config.optionA
                        ),

                        effect:
                            "reduce_reject_rate_50_percent"
                    },

                    optionB: {
                        ...getSelectMetadata(
                            data,
                            config.optionB
                        ),

                        ...getImprovementState(
                            config.optionB
                        ),

                        effect:
                            "reduce_setup_cost_50_percent"
                    },

                    optionC: {
                        ...getSelectMetadata(
                            data,
                            config.optionC
                        ),

                        ...getImprovementState(
                            config.optionC
                        ),

                        effect:
                            "increase_sq_rating_1_star"
                    },

                    optionD: {
                        ...getSelectMetadata(
                            data,
                            config.optionD
                        ),

                        ...getImprovementState(
                            config.optionD
                        ),

                        effect:
                            "increase_worker_productivity_50_percent"
                    }

                }

            },


            space: {

                newConstruction:
                    getSelectMetadata(
                        data,
                        config.additionalSpace,
                        "000s_pairs_capacity"
                    )

            }

        };

    }


    const calculatedMetadata = {

        capitalOutlays: {
            editable: false,
            calculated: true,
            unit: "$000s"
        },

        overallProjection: {
            editable: false,
            calculated: true
        }

    };

    // =================================
    // EQUIPMENT
    // =================================

    const equipmentTable =
        getTableByIndex(4);


    const spaceAvailableCurrentYear =
        getFourFacilityValues(
            equipmentTable,
            "Space Available for Footwear Production Equipment"
        );


    const equipmentBeginningYear =
        getFourFacilityValues(
            equipmentTable,
            "Production Equipment in Place"
        );


    const productionCapability =
        getFourFacilityValues(
            equipmentTable,
            "Total Footwear Production Capability"
        );

    function parseEquipmentMix(
        table
    ) {

        const row =
            findRow(
                table,
                "Percentage of New / Refurbished"
            );

        const result = {
            northAmerica: {
                newPct: null,
                refurbishedPct: null
            },
            europeAfrica: {
                newPct: null,
                refurbishedPct: null
            },
            asiaPacific: {
                newPct: null,
                refurbishedPct: null
            },
            latinAmerica: {
                newPct: null,
                refurbishedPct: null
            }
        };

        if (!row) {
            return result;
        }

        const regions = [
            "northAmerica",
            "europeAfrica",
            "asiaPacific",
            "latinAmerica"
        ];


        row
            .slice(1, 5)
            .forEach(
                (
                    cell,
                    index
                ) => {

                    const values =
                        String(cell)
                            .match(
                                /[\d.]+/g
                            ) || [];

                    result[
                        regions[index]
                    ] = {

                        newPct:
                            values[0] !== undefined
                                ? Number(values[0])
                                : null,

                        refurbishedPct:
                            values[1] !== undefined
                                ? Number(values[1])
                                : null

                    };

                }
            );


        return result;

    }

    const equipmentMix =
        parseEquipmentMix(
            equipmentTable
        );

    function getSavingsValues(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {
            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };
        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {
            northAmerica:
                values[0] ?? null,

            europeAfrica:
                values[1] ?? null,

            asiaPacific:
                values[2] ?? null,

            latinAmerica:
                values[3] ?? null
        };

    }
    
    const improvementTable =
        getTableByIndex(5);


    const optionASavings =
        getSavingsValues(
            improvementTable,
            "Projected annual cost savings at current reject rate"
        );


    const optionBSavings =
        getSavingsValues(
            improvementTable,
            "Projected annual cost savings at current model count"
        );


    const optionCSavings =
        getSavingsValues(
            improvementTable,
            "Projected annual cost savings at current S/Q effort"
        );


    const optionDSavings =
        getSavingsValues(
            improvementTable,
            "Projected annual cost savings at current production"
        );

    function getOptionCapitalOutlays(
        table,
        optionLabel
    ) {

        const row =
            findRow(
                table,
                optionLabel
            );

        if (!row) {
            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };
        }

        const currencyValues =
            row
                .filter(
                    cell => {

                        const text =
                            String(cell)
                                .trim();

                        return /^\$\s*[\d,]+(?:\.\d+)?$/
                            .test(text);

                    }
                )
                .map(parseNumber);


        return {
            northAmerica:
                currencyValues[0] ??
                null,

            europeAfrica:
                currencyValues[1] ??
                null,

            asiaPacific:
                currencyValues[2] ??
                null,

            latinAmerica:
                currencyValues[3] ??
                null
        };

    }

    const optionACapital =
        getOptionCapitalOutlays(
            improvementTable,
            "Option A"
        );

    const optionBCapital =
        getOptionCapitalOutlays(
            improvementTable,
            "Option B"
        );

    const optionCCapital =
        getOptionCapitalOutlays(
            improvementTable,
            "Option C"
        );

    const optionDCapital =
        getOptionCapitalOutlays(
            improvementTable,
            "Option D"
        );

    // =================================
    // FACILITY SPACE
    // =================================

    const spaceTable =
        getTableByIndex(6);


    const spaceEndPriorYear =
        getFourFacilityValues(
            spaceTable,
            "Equipment Space at the End"
        );


    const constructionFromPriorYear =
        getFourFacilityValues(
            spaceTable,
            "Construction of Additional Space"
        );


    const spaceAvailableThisYear =
        getFourFacilityValues(
            spaceTable,
            "Space Available for Equipment in Year 12"
        );


    const spaceAvailableNextYear =
        getFourFacilityValues(
            spaceTable,
            "Space Available for Production Equipment in Year 13"
        );

    const additionalSpaceDecisions = {};

    for (
        const [
            region,
            config
        ] of Object.entries(
            facilityConfig
        )
    ) {

        additionalSpaceDecisions[
            region
        ] =
            getSelectedNumber(
                config.additionalSpace
            );

    }

    // =================================
    // CAPITAL OUTLAYS
    // =================================

    const capitalTable =
        getTableByIndex(7);


    const newEquipmentOutlay =
        getFourFacilityValues(
            capitalTable,
            "Purchase of New Equipment"
        );


    const refurbishedEquipmentOutlay =
        getFourFacilityValues(
            capitalTable,
            "Purchase of Refurbished Equipment"
        );


    const equipmentSoldBookValue =
        getFourFacilityValues(
            capitalTable,
            "Book Value of Equipment Sold"
        );


    const upgradeOptionsOutlay =
        getFourFacilityValues(
            capitalTable,
            "Equipment Upgrade Options"
        );


    const energyEfficiencyOutlay =
        getFourFacilityValues(
            capitalTable,
            "Energy Efficiency Initiatives"
        );


    const facilitySpaceOutlay =
        getFourFacilityValues(
            capitalTable,
            "New / Additional Facility Space"
        );


    const netCapitalOutlay =
        getFourFacilityValues(
            capitalTable,
            "Net Capital Outlays"
        );

    // =================================
    // OVERALL PROJECTION
    // =================================

    const projectionTable =
        getTableByIndex(3);


    function getProjectionNumber(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        return parseNumber(
            row[1]
        );

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        return row[1] ?? null;

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };

    // =================================
    // BUILD FACILITIES
    // =================================

    const regions = [
        "northAmerica",
        "europeAfrica",
        "asiaPacific",
        "latinAmerica"
    ];


    const facilities = {};


    for (
        const region of regions
    ) {

        const config =
            facilityConfig[
                region
            ];


        facilities[
            region
        ] = {

            equipment: {

                spaceAvailable:
                    spaceAvailableCurrentYear[
                        region
                    ],

                equipmentAtBeginning:
                    equipmentBeginningYear[
                        region
                    ],

                purchaseNew:
                    getSelectedNumber(
                        config.newEquipment
                    ),

                purchaseRefurbished:
                    getSelectedNumber(
                        config.refurbishedEquipment
                    ),

                sellExisting:
                    getSelectedNumber(
                        config.equipmentSold
                    ),

                productionCapability:
                    productionCapability[
                        region
                    ],

                equipmentMix:
                    equipmentMix[
                        region
                    ]

            },


            improvements: {

                optionA: {

                    ...getImprovementState(
                        config.optionA
                    ),

                    description:
                        "Reduce reject rate by 50%",

                    capitalOutlay:
                        optionACapital[
                            region
                        ],

                    projectedAnnualSavings:
                        optionASavings[
                            region
                        ]

                },


                optionB: {

                    ...getImprovementState(
                        config.optionB
                    ),

                    description:
                        "Reduce production run setup costs by 50%",

                    capitalOutlay:
                        optionBCapital[
                            region
                        ],

                    projectedAnnualSavings:
                        optionBSavings[
                            region
                        ]

                },


                optionC: {

                    ...getImprovementState(
                        config.optionC
                    ),

                    description:
                        "Increase S/Q rating by 1 star",

                    capitalOutlay:
                        optionCCapital[
                            region
                        ],

                    projectedAnnualSavings:
                        optionCSavings[
                            region
                        ]

                },


                optionD: {

                    ...getImprovementState(
                        config.optionD
                    ),

                    description:
                        "Increase worker productivity by 50%",

                    capitalOutlay:
                        optionDCapital[
                            region
                        ],

                    projectedAnnualSavings:
                        optionDSavings[
                            region
                        ]

                }

            },


            space: {

                endPriorYear:
                    spaceEndPriorYear[
                        region
                    ],

                constructionFromPriorYear:
                    constructionFromPriorYear[
                        region
                    ],

                availableThisYear:
                    spaceAvailableThisYear[
                        region
                    ],

                newConstruction:
                    additionalSpaceDecisions[
                        region
                    ],

                availableNextYear:
                    spaceAvailableNextYear[
                        region
                    ]

            },


            capitalOutlays: {

                newEquipment:
                    newEquipmentOutlay[
                        region
                    ],

                refurbishedEquipment:
                    refurbishedEquipmentOutlay[
                        region
                    ],

                equipmentSoldBookValue:
                    equipmentSoldBookValue[
                        region
                    ],

                improvementOptions:
                    upgradeOptionsOutlay[
                        region
                    ],

                energyEfficiency:
                    energyEfficiencyOutlay[
                        region
                    ],

                facilitySpace:
                    facilitySpaceOutlay[
                        region
                    ],

                net:
                    netCapitalOutlay[
                        region
                    ]

            }

        };

    }

   return {

        pageType:
            "decision",

        decisionType:
            "production_facilities",

        year,

        overallProjection,

        facilities,

        decisionMetadata,

        calculatedMetadata

    };

}

function parseDistributionWarehousePage(
    data
) {

    // =================================
    // BASIC HELPERS
    // =================================

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/[$,%★,]/g, "")
                .replace(/\bpairs?\b/gi, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getInputNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.selectedText ??
            input.value
        );

    }


    function getTableByIndex(
        index
    ) {

        return (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === index
        ) || null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function getFourValues(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {

            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };

        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {
            northAmerica:
                values[0] ?? null,

            europeAfrica:
                values[1] ?? null,

            asiaPacific:
                values[2] ?? null,

            latinAmerica:
                values[3] ?? null
        };

    }


    function getCostPairs(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {

            return {
                northAmerica: {
                    total: null,
                    perPair: null
                },
                europeAfrica: {
                    total: null,
                    perPair: null
                },
                asiaPacific: {
                    total: null,
                    perPair: null
                },
                latinAmerica: {
                    total: null,
                    perPair: null
                }
            };

        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {

            northAmerica: {
                total:
                    values[0] ?? null,
                perPair:
                    values[1] ?? null
            },

            europeAfrica: {
                total:
                    values[2] ?? null,
                perPair:
                    values[3] ?? null
            },

            asiaPacific: {
                total:
                    values[4] ?? null,
                perPair:
                    values[5] ?? null
            },

            latinAmerica: {
                total:
                    values[6] ?? null,
                perPair:
                    values[7] ?? null
            }

        };

    }

    // =================================
    // ACTIVE YEAR
    // =================================

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }

    // =================================
    // SHIPPING DECISION INPUTS
    // =================================

    const shipmentConfig = {

        northAmerica: {

            northAmerica:
                "entry-input-G166",

            europeAfrica:
                "entry-input-G167",

            asiaPacific:
                "entry-input-G168",

            latinAmerica:
                "entry-input-G169"

        },


        europeAfrica: {

            northAmerica:
                "entry-input-G173",

            europeAfrica:
                "entry-input-G174",

            asiaPacific:
                "entry-input-G175",

            latinAmerica:
                "entry-input-G176"

        },


        asiaPacific: {

            northAmerica:
                "entry-input-G180",

            europeAfrica:
                "entry-input-G181",

            asiaPacific:
                "entry-input-G182",

            latinAmerica:
                "entry-input-G183"

        },


        latinAmerica: {

            northAmerica:
                "entry-input-G187",

            europeAfrica:
                "entry-input-G188",

            asiaPacific:
                "entry-input-G189",

            latinAmerica:
                "entry-input-G190"

        }

    };

    const regions = [
        "northAmerica",
        "europeAfrica",
        "asiaPacific",
        "latinAmerica"
    ];


    const shippingDecisions = {};


        for (
            const source of regions
        ) {

            shippingDecisions[
                source
            ] = {};

            for (
                const destination of regions
            ) {

                shippingDecisions[
                    source
                ][
                    destination
                ] =
                    getInputNumber(
                        shipmentConfig[
                            source
                        ][
                            destination
                        ]
                    );

            }

        }


        const shipmentMetadata = {};


    for (
        const source of regions
    ) {

        shipmentMetadata[source] = {};

        for (
            const destination of regions
        ) {

            shipmentMetadata[source][destination] =
                getInputMetadata(
                    data,
                    shipmentConfig[source][destination],
                    "000s_pairs"
                );

        }

    }

    // =================================
    // FACILITY SHIPMENT AVAILABILITY
    // =================================

    const distributionTable =
        getTableByIndex(4);


    const pairsAvailableForShipment =
        getFourValues(
            distributionTable,
            "Pairs Available for Shipment"
        );


    const remainingUnshipped =
        getFourValues(
            distributionTable,
            "Remaining Pairs to be Shipped"
        );

    function getWarehouseTriples(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        const result = {};

        if (!row) {

            for (
                const region of regions
            ) {

                result[region] = {
                    pairs: null,
                    models: null,
                    sq: null
                };

            }

            return result;

        }


        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );


        regions.forEach(
            (
                region,
                index
            ) => {

                const offset =
                    index * 3;

                result[
                    region
                ] = {

                    pairs:
                        values[
                            offset
                        ] ?? null,

                    models:
                        values[
                            offset + 1
                        ] ?? null,

                    sq:
                        values[
                            offset + 2
                        ] ?? null

                };

            }
        );


        return result;

    }

    const priorInventoryTable =
        getTableByIndex(5);


    const priorInventory =
        getWarehouseTriples(
            priorInventoryTable,
            "Inventory Left Over"
        );

    // =================================
    // INVENTORY CLEARANCE
    // =================================

    const clearanceConfig = {

        northAmerica:
            "G194-btn",

        europeAfrica:
            "G195-btn",

        asiaPacific:
            "G196-btn",

        latinAmerica:
            "G197-btn"

    };

    const clearancePercent = {};

    for (
        const region of regions
    ) {

        clearancePercent[
            region
        ] =
            getInputNumber(
                clearanceConfig[
                    region
                ]
            );

    }


    const clearanceMetadata = {};


        for (
            const region of regions
        ) {

            clearanceMetadata[region] =
                getSelectMetadata(
                    data,
                    clearanceConfig[region],
                    "percent"
                );

        }


    const decisionMetadata = {

        facilities: {},

        warehouses: {}

    };


    for (
        const region of regions
    ) {

        decisionMetadata.facilities[region] = {

            shipments:
                shipmentMetadata[region],

            shipmentDirection: {
                source:
                    region,

                meaning:
                    "pairs_shipped_from_facility_to_destination_warehouse"
            }

        };


        decisionMetadata.warehouses[region] = {

            clearancePercent:
                clearanceMetadata[region]

        };

    }


    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        facilities: {

            pairsAvailableForShipment: {
                editable: false,
                calculated: true,
                unit: "000s_pairs"
            },

            remainingUnshipped: {
                editable: false,
                calculated: true,
                unit: "000s_pairs"
            }

        },

        warehouses: {

            priorInventory: {
                editable: false,
                calculated: false,
                historical: true
            },

            clearance: {

                pairsCleared: {
                    editable: false,
                    calculated: true,
                    unit: "000s_pairs"
                },

                discountedRevenue: {
                    editable: false,
                    calculated: true
                },

                directCost: {
                    editable: false,
                    calculated: true
                },

                marginOverDirectCost: {
                    editable: false,
                    calculated: true
                }

            },

            inventoryAndDemand: {

                beginningInventory: {
                    editable: false,
                    calculated: true
                },

                incomingShipments: {
                    editable: false,
                    calculated: true
                },

                availableForSale: {
                    editable: false,
                    calculated: true
                },

                projectedDemand: {
                    editable: false,
                    calculated: true,
                    unit: "000s_pairs"
                },

                requiredInventory: {
                    editable: false,
                    calculated: true,
                    unit: "000s_pairs"
                },

                projectedSurplusShortfall: {
                    editable: false,
                    calculated: true,
                    unit: "000s_pairs"
                }

            },

            costs: {
                editable: false,
                calculated: true
            }

        }

    };



    function getPairsCleared(
        table
    ) {

        const row =
            findRow(
                table,
                "Inventory Clearance"
            );

        const result = {
            northAmerica: null,
            europeAfrica: null,
            asiaPacific: null,
            latinAmerica: null
        };

        if (!row) {
            return result;
        }


        result.northAmerica =
            parseNumber(
                row[2]
            );

        result.europeAfrica =
            parseNumber(
                row[4]
            );

        result.asiaPacific =
            parseNumber(
                row[6]
            );

        result.latinAmerica =
            parseNumber(
                row[8]
            );


        return result;

    }


    const clearanceTable =
        getTableByIndex(6);


    const pairsCleared =
        getPairsCleared(
            clearanceTable
        );

            const clearanceStatsTable =
        getTableByIndex(7);


    const clearanceRevenue =
        getCostPairs(
            clearanceStatsTable,
            "Discounted Clearance Revenues"
        );

    const clearanceDirectCost =
        getCostPairs(
            clearanceStatsTable,
            "Direct Cost of Pairs Cleared"
        );


    const clearanceMargin =
        getCostPairs(
            clearanceStatsTable,
            "Margin Over Direct Cost"
        );

        const warehouseTable =
        getTableByIndex(8);


    const beginningInventory =
        getWarehouseTriples(
            warehouseTable,
            "Beginning Inventory"
        );


    const availableForSale =
        getWarehouseTriples(
            warehouseTable,
            "Pairs Available for Sale"
        );

    function getIncomingShipmentTriples(
        table,
        sourceLabel
    ) {

        return getWarehouseTriples(
            table,
            sourceLabel
        );

    }


    const incomingShipments = {

        northAmerica:
            getIncomingShipmentTriples(
                warehouseTable,
                "North America Facility"
            ),

        europeAfrica:
            getIncomingShipmentTriples(
                warehouseTable,
                "Europe-Africa Facility"
            ),

        asiaPacific:
            getIncomingShipmentTriples(
                warehouseTable,
                "Asia-Pacific Facility"
            ),

        latinAmerica:
            getIncomingShipmentTriples(
                warehouseTable,
                "Latin America Facility"
            )

    };

    const projectedDemand =
        getFourValues(
            warehouseTable,
            "Projected Demand"
        );


    const requiredInventory =
        getFourValues(
            warehouseTable,
            "Required Inventory"
        );


    const projectedSurplusShortfall =
        getFourValues(
            warehouseTable,
            "Projected Inventory Surplus"
        );

    // =================================
    // DISTRIBUTION / WAREHOUSE COSTS
    // =================================

    const costTable =
        getTableByIndex(9);


    const exchangeRateAdjustment =
        getCostPairs(
            costTable,
            "Exchange Rate Cost Adjustment"
        );


    const freight =
        getCostPairs(
            costTable,
            "Freight on Footwear Shipments"
        );


    const tariffs =
        getCostPairs(
            costTable,
            "Tariffs on Pairs Imported"
        );


    const inventoryStorage =
        getCostPairs(
            costTable,
            "Inventory Storage"
        );


    const packagingShipping =
        getCostPairs(
            costTable,
            "Packaging / Shipping"
        );


    const warehouseLeaseMaintenance =
        getCostPairs(
            costTable,
            "Warehouse Lease / Maintenance"
        );


    const totalDistributionWarehouseCost =
        getCostPairs(
            costTable,
            "Total Dist. and Whse. Costs"
        );
    
    // =================================
    // FACILITIES
    // =================================

    const facilities = {};


    for (
        const region of regions
    ) {

        facilities[
            region
        ] = {

            pairsAvailableForShipment:
                pairsAvailableForShipment[
                    region
                ],

            shipments:
                shippingDecisions[
                    region
                ],

            remainingUnshipped:
                remainingUnshipped[
                    region
                ]

        };

    }

    // =================================
    // WAREHOUSES
    // =================================

    const warehouses = {};


    for (
        const region of regions
    ) {

        warehouses[
            region
        ] = {

            priorInventory:
                priorInventory[
                    region
                ],


            clearance: {

                percent:
                    clearancePercent[
                        region
                    ],

                pairsCleared:
                    pairsCleared[
                        region
                    ],

                discountedRevenue:
                    clearanceRevenue[
                        region
                    ],

                directCost:
                    clearanceDirectCost[
                        region
                    ],

                marginOverDirectCost:
                    clearanceMargin[
                        region
                    ]

            },


            inventoryAndDemand: {

                beginningInventory:
                    beginningInventory[
                        region
                    ],

                incomingShipments: {

                    northAmerica:
                        incomingShipments
                            .northAmerica[
                                region
                            ],

                    europeAfrica:
                        incomingShipments
                            .europeAfrica[
                                region
                            ],

                    asiaPacific:
                        incomingShipments
                            .asiaPacific[
                                region
                            ],

                    latinAmerica:
                        incomingShipments
                            .latinAmerica[
                                region
                            ]

                },

                availableForSale:
                    availableForSale[
                        region
                    ],

                projectedDemand:
                    projectedDemand[
                        region
                    ],

                requiredInventory:
                    requiredInventory[
                        region
                    ],

                projectedSurplusShortfall:
                    projectedSurplusShortfall[
                        region
                    ]

            },


            costs: {

                exchangeRateAdjustment:
                    exchangeRateAdjustment[
                        region
                    ],

                freight:
                    freight[
                        region
                    ],

                tariffs:
                    tariffs[
                        region
                    ],

                inventoryStorage:
                    inventoryStorage[
                        region
                    ],

                packagingShipping:
                    packagingShipping[
                        region
                    ],

                warehouseLeaseMaintenance:
                    warehouseLeaseMaintenance[
                        region
                    ],

                total:
                    totalDistributionWarehouseCost[
                        region
                    ]

            }

        };

    }

    // =================================
    // OVERALL PROJECTION
    // =================================

    const projectionTable =
        getTableByIndex(3);


    function getProjectionNumber(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        return parseNumber(
            row[1]
        );

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        if (!row) {
            return null;
        }

        return row[1] ?? null;

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };

    // =================================
    // FINAL NORMALIZED RESULT
    // =================================

    return {

        pageType:
            "decision",

        decisionType:
            "distribution_warehouse",

        year,

        overallProjection,

        facilities,

        warehouses,

        decisionMetadata,

        calculatedMetadata

    };

}

function parsePrivateLabelPage(
    data
) {

    // =================================
    // BASIC HELPERS
    // =================================

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/[$,%★,]/g, "")
                .replace(/\bpairs?\b/gi, "")
                .replace(/\bmodels?\b/gi, "")
                .replace(/\bper pair\b/gi, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getInputNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.selectedText ??
            input.value
        );

    }


    function getYesNo(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        const text =
            String(
                input.selectedText ?? ""
            )
                .trim()
                .toLowerCase();

        if (text === "yes") {
            return true;
        }

        if (text === "no") {
            return false;
        }

        return null;

    }


    function getTableByIndex(
        index
    ) {

        return (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === index
        ) || null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function findRows(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return [];
        }

        const target =
            searchText.toLowerCase();

        return table.rows.filter(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        );

    }


    function getFourValues(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {

            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };

        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {
            northAmerica:
                values[0] ?? null,

            europeAfrica:
                values[1] ?? null,

            asiaPacific:
                values[2] ?? null,

            latinAmerica:
                values[3] ?? null
        };

    }


    function getCostPairsFromRow(
        row
    ) {

        const empty = {
            northAmerica: {
                total: null,
                perUnit: null
            },
            europeAfrica: {
                total: null,
                perUnit: null
            },
            asiaPacific: {
                total: null,
                perUnit: null
            },
            latinAmerica: {
                total: null,
                perUnit: null
            }
        };

        if (!row) {
            return empty;
        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {

            northAmerica: {
                total:
                    values[0] ?? null,
                perUnit:
                    values[1] ?? null
            },

            europeAfrica: {
                total:
                    values[2] ?? null,
                perUnit:
                    values[3] ?? null
            },

            asiaPacific: {
                total:
                    values[4] ?? null,
                perUnit:
                    values[5] ?? null
            },

            latinAmerica: {
                total:
                    values[6] ?? null,
                perUnit:
                    values[7] ?? null
            }

        };

    }

    // =================================
    // ACTIVE YEAR
    // =================================

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }

    const facilityConfig = {

        northAmerica: {
            superiorMaterials:
                "G326-btn",
            styling:
                "G327-btn"
        },

        europeAfrica: {
            superiorMaterials:
                "G338-btn",
            styling:
                "G339-btn"
        },

        asiaPacific: {
            superiorMaterials:
                "G350-btn",
            styling:
                "G351-btn"
        },

        latinAmerica: {
            superiorMaterials:
                "G362-btn",
            styling:
                "G363-btn"
        }

    };

    const specsTable =
        getTableByIndex(4);


    const standardMaterials =
        getFourValues(
            specsTable,
            "Standard Materials"
        );


    const modelsStyles =
        getFourValues(
            specsTable,
            "Number of Models / Styles"
        );

    const qualityTable =
        getTableByIndex(5);

    const productionTable =
        getTableByIndex(6);


    const projectedSQ =
        getFourValues(
            qualityTable,
            "S/Q Rating"
        );


    const capacityAvailable =
        getFourValues(
            productionTable,
            "Production Capability Available"
        );

    let globalMinimumSQ = null;

    const sqRow =
        findRow(
            qualityTable,
            "Global Minimum"
        );

    if (sqRow?.[0]) {

        const match =
            String(
                sqRow[0]
            ).match(
                /Global Minimum\s*=\s*([\d.]+)/i
            );

        if (match) {
            globalMinimumSQ =
                Number(match[1]);
        }

    }

    const shipmentConfig = {

        northAmerica: {

            northAmerica:
                "entry-input-G331",

            europeAfrica:
                "entry-input-G332",

            asiaPacific:
                "entry-input-G333",

            latinAmerica:
                "entry-input-G334"

        },


        europeAfrica: {

            northAmerica:
                "entry-input-G343",

            europeAfrica:
                "entry-input-G344",

            asiaPacific:
                "entry-input-G345",

            latinAmerica:
                "entry-input-G346"

        },


        asiaPacific: {

            northAmerica:
                "entry-input-G355",

            europeAfrica:
                "entry-input-G356",

            asiaPacific:
                "entry-input-G357",

            latinAmerica:
                "entry-input-G358"

        },


        latinAmerica: {

            northAmerica:
                "entry-input-G367",

            europeAfrica:
                "entry-input-G368",

            asiaPacific:
                "entry-input-G369",

            latinAmerica:
                "entry-input-G370"

        }

    };


    const regions = [
        "northAmerica",
        "europeAfrica",
        "asiaPacific",
        "latinAmerica"
    ];


    const shippingDecisions = {};


    for (
        const source of regions
    ) {

        shippingDecisions[
            source
        ] = {};

        for (
            const destination of regions
        ) {

            shippingDecisions[
                source
            ][
                destination
            ] =
                getInputNumber(
                    shipmentConfig[
                        source
                    ][
                        destination
                    ]
                );

        }

    }


    const shipmentMetadata = {};

    for (
        const source of regions
    ) {

        shipmentMetadata[source] = {};

        for (
            const destination of regions
        ) {

            shipmentMetadata[source][destination] =
                getInputMetadata(
                    data,
                    shipmentConfig[source][destination],
                    "000s_pairs"
                );

        }

    }

    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        facilityProduction: {
            editable: false,
            calculated: true
        },

        contractEconomics: {
            editable: false,
            calculated: true
        },

        globalMinimumSQ: {
            editable: false,
            calculated: false,
            constraint: true,
            unit: "sq_stars"
        }

    };

    const regularProduction =
        getFourValues(
            productionTable,
            "Regular Time"
        );


    const overtimeProduction =
        getFourValues(
            productionTable,
            "Overtime"
        );


    const netProduction =
        getFourValues(
            productionTable,
            "Net Private-Label Production"
        );


    const projectedProductionCost =
        getFourValues(
            productionTable,
            "Projected Cost of Private-Label"
        );

    function getRejectedPairs(
        table
    ) {

        const result = {
            northAmerica: {
                pairs: null,
                rate: null
            },
            europeAfrica: {
                pairs: null,
                rate: null
            },
            asiaPacific: {
                pairs: null,
                rate: null
            },
            latinAmerica: {
                pairs: null,
                rate: null
            }
        };


        const row =
            findRow(
                table,
                "Pairs Rejected"
            );

        if (!row) {
            return result;
        }


        regions.forEach(
            (
                region,
                index
            ) => {

                const text =
                    String(
                        row[index + 1] ?? ""
                    );

                const pairMatch =
                    text.match(
                        /^([\d,]+)/
                    );

                const rateMatch =
                    text.match(
                        /\(([\d.]+)%\)/
                    );


                result[
                    region
                ] = {

                    pairs:
                        pairMatch
                            ? Number(
                                pairMatch[1]
                                    .replace(
                                        /,/g,
                                        ""
                                    )
                            )
                            : null,

                    rate:
                        rateMatch
                            ? Number(
                                rateMatch[1]
                            )
                            : null

                };

            }
        );


        return result;

    }


    const rejectedPairs =
        getRejectedPairs(
            productionTable
        );

    const offerTable =
        getTableByIndex(7);


    function getMarketValues(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {

            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };

        }

        // Some rows have explanatory text
        // before the four market values.
        const numbers =
            row
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {
            northAmerica:
                numbers[
                    numbers.length - 4
                ] ?? null,

            europeAfrica:
                numbers[
                    numbers.length - 3
                ] ?? null,

            asiaPacific:
                numbers[
                    numbers.length - 2
                ] ?? null,

            latinAmerica:
                numbers[
                    numbers.length - 1
                ] ?? null
        };

    }


    const projectedDemand =
        getMarketValues(
            offerTable,
            "Private-Label Demand"
        );


    const pairsOffered =
        getMarketValues(
            offerTable,
            "Pairs Offered for Sale"
        );


    const projectedMarketShare =
        getMarketValues(
            offerTable,
            "Projected Private-Label Market Share"
        );

    const contractConfig = {

        northAmerica: {
            price:
                "entry-input-G374",
            include:
                "G378-btn"
        },

        europeAfrica: {
            price:
                "entry-input-G380",
            include:
                "G384-btn"
        },

        asiaPacific: {
            price:
                "entry-input-G386",
            include:
                "G390-btn"
        },

        latinAmerica: {
            price:
                "entry-input-G392",
            include:
                "G396-btn"
        }

    };

    const decisionMetadata = {

        facilities: {},

        contractOffers: {}

    };


    for (
        const region of regions
    ) {

        const facility =
            facilityConfig[region];

        const contract =
            contractConfig[region];


        decisionMetadata
            .facilities[region] = {

            superiorMaterialsPct:
                getSelectMetadata(
                    data,
                    facility.superiorMaterials,
                    "percent"
                ),

            enhancedStyling:
                getSelectMetadata(
                    data,
                    facility.styling,
                    "dollars_per_pair"
                ),

            shipments: {
                editable: true,
                unit: "000s_pairs"
            }

        };


        decisionMetadata
            .contractOffers[region] = {

            projectedDemand: {
                editable: false,
                calculated: true,
                unit: "000s_pairs"
            },

            pairsOffered: {
                editable: false,
                calculated: true,
                unit: "000s_pairs"
            },

            priceOffer:
                getInputMetadata(
                    data,
                    contract.price,
                    "dollars_per_pair"
                ),

            projectedMarketShare: {
                editable: false,
                calculated: true,
                unit: "percent"
            },

            economics: {
                editable: false,
                calculated: true
            },

            includeInProjection: {
                ...getSelectMetadata(
                    data,
                    contract.include
                ),

                type:
                    "boolean",

                meaning:
                    "include_projected_contract_outcome_in_company_projections",

                doesNotMean:
                    "submit_or_withdraw_private_label_offer"
            }

        };

    }

    const economicsTable =
        getTableByIndex(8);


    const grossRevenue =
        getCostPairsFromRow(
            findRow(
                economicsTable,
                "Gross Private-Label Revenues"
            )
        );


    const netRevenue =
        getCostPairsFromRow(
            findRow(
                economicsTable,
                "Net Private-Label Revenues"
            )
        );


    const productionCost =
        getCostPairsFromRow(
            findRow(
                economicsTable,
                "Production Cost"
            )
        );


    const freightPackagingTariffs =
        getCostPairsFromRow(
            findRow(
                economicsTable,
                "Freight / Packaging / Tariffs"
            )
        );


    const marginOverDirectCosts =
        getCostPairsFromRow(
            findRow(
                economicsTable,
                "Margin Over Direct Costs"
            )
        );


    const exchangeRows =
        findRows(
            economicsTable,
            "Exchange Rate Adjustments"
        );


    const revenueExchangeAdjustment =
        getCostPairsFromRow(
            exchangeRows[0] ?? null
        );


    const costExchangeAdjustment =
        getCostPairsFromRow(
            exchangeRows[1] ?? null
        );

        const projectionTable =
        getTableByIndex(3);


    function getProjectionNumber(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? parseNumber(
                row[1]
            )
            : null;

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? row[1] ?? null
            : null;

    }

    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };

    const facilities = {};


    for (
        const region of regions
    ) {

        const config =
            facilityConfig[
                region
            ];


        facilities[
            region
        ] = {

            decisions: {

                standardMaterialsPct:
                    standardMaterials[
                        region
                    ],

                superiorMaterialsPct:
                    getInputNumber(
                        config.superiorMaterials
                    ),

                modelsStyles:
                    modelsStyles[
                        region
                    ],

                enhancedStyling:
                    getInputNumber(
                        config.styling
                    )

            },


            quality: {

                projectedSQ:
                    projectedSQ[
                        region
                    ],

                globalMinimumSQ

            },


            capacityAvailable:
                capacityAvailable[
                    region
                ],


            shipments:
                shippingDecisions[
                    region
                ],


            production: {

                regular:
                    regularProduction[
                        region
                    ],

                overtime:
                    overtimeProduction[
                        region
                    ],

                rejected:
                    rejectedPairs[
                        region
                    ],

                net:
                    netProduction[
                        region
                    ],

                projectedCostPerPair:
                    projectedProductionCost[
                        region
                    ]

            }

        };

    }

    const contractOffers = {};


    for (
        const region of regions
    ) {

        const config =
            contractConfig[
                region
            ];


        contractOffers[
            region
        ] = {

            projectedDemand:
                projectedDemand[
                    region
                ],

            pairsOffered:
                pairsOffered[
                    region
                ],

            priceOffer:
                getInputNumber(
                    config.price
                ),

            projectedMarketShare:
                projectedMarketShare[
                    region
                ],


            economics: {

                grossRevenue:
                    grossRevenue[
                        region
                    ],

                revenueExchangeAdjustment:
                    revenueExchangeAdjustment[
                        region
                    ],

                netRevenue:
                    netRevenue[
                        region
                    ],

                productionCost:
                    productionCost[
                        region
                    ],

                productionCostExchangeAdjustment:
                    costExchangeAdjustment[
                        region
                    ],

                freightPackagingTariffs:
                    freightPackagingTariffs[
                        region
                    ],

                marginOverDirectCosts:
                    marginOverDirectCosts[
                        region
                    ]

            },


            includeInProjection:
                getYesNo(
                    config.include
                )

        };

    }

    return {

        pageType:
            "decision",

        decisionType:
            "private_label_operations",

        year,

        overallProjection,

        globalMinimumSQ,

        facilities,

        contractOffers,

        decisionMetadata,

        calculatedMetadata

    };

}

function parseCompensationTrainingPage(
    data
) {

    // =================================
    // HELPERS
    // =================================

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/[$,%★,]/g, "")
                .replace(/\bpairs?\b/gi, "")
                .replace(/\bper worker\b/gi, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getInputNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.selectedText ??
            input.value
        );

    }


    function getTableByIndex(
        index
    ) {

        return (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === index
        ) || null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function getFourValues(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {
            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };
        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {
            northAmerica:
                values[0] ?? null,

            europeAfrica:
                values[1] ?? null,

            asiaPacific:
                values[2] ?? null,

            latinAmerica:
                values[3] ?? null
        };

    }


    function getCostPairs(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {
            return {
                northAmerica: {
                    total: null,
                    perPair: null
                },
                europeAfrica: {
                    total: null,
                    perPair: null
                },
                asiaPacific: {
                    total: null,
                    perPair: null
                },
                latinAmerica: {
                    total: null,
                    perPair: null
                }
            };
        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {

            northAmerica: {
                total:
                    values[0] ?? null,
                perPair:
                    values[1] ?? null
            },

            europeAfrica: {
                total:
                    values[2] ?? null,
                perPair:
                    values[3] ?? null
            },

            asiaPacific: {
                total:
                    values[4] ?? null,
                perPair:
                    values[5] ?? null
            },

            latinAmerica: {
                total:
                    values[6] ?? null,
                perPair:
                    values[7] ?? null
            }

        };

    }

    // =================================
    // YEAR
    // =================================

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }

    const regions = [
        "northAmerica",
        "europeAfrica",
        "asiaPacific",
        "latinAmerica"
    ];


    const facilityConfig = {

        northAmerica: {
            baseWageChange:
                "G4-btn",
            incentivePay:
                "G5-btn",
            fringeBenefits:
                "G6-btn",
            training:
                "G8-btn",
            supervisorRatio:
                "G10-btn",
            supervisorCompChange:
                "G11-btn"
        },

        europeAfrica: {
            baseWageChange:
                "G15-btn",
            incentivePay:
                "G16-btn",
            fringeBenefits:
                "G17-btn",
            training:
                "G19-btn",
            supervisorRatio:
                "G21-btn",
            supervisorCompChange:
                "G22-btn"
        },

        asiaPacific: {
            baseWageChange:
                "G26-btn",
            incentivePay:
                "G27-btn",
            fringeBenefits:
                "G28-btn",
            training:
                "G30-btn",
            supervisorRatio:
                "G32-btn",
            supervisorCompChange:
                "G33-btn"
        },

        latinAmerica: {
            baseWageChange:
                "G37-btn",
            incentivePay:
                "G38-btn",
            fringeBenefits:
                "G39-btn",
            training:
                "G41-btn",
            supervisorRatio:
                "G43-btn",
            supervisorCompChange:
                "G44-btn"
        }

    };

    const decisionMetadata = {
        facilities: {}
    };


    for (
        const [
            region,
            config
        ] of Object.entries(
            facilityConfig
        )
    ) {

        decisionMetadata.facilities[region] = {

            baseWageChangePct:
                getSelectMetadata(
                    data,
                    config.baseWageChange,
                    "percent"
                ),

            incentivePayPerPair:
                getSelectMetadata(
                    data,
                    config.incentivePay,
                    "dollars_per_pair"
                ),

            fringeBenefitsPerYear:
                getSelectMetadata(
                    data,
                    config.fringeBenefits,
                    "dollars_per_worker_per_year"
                ),

            bestPracticesTrainingPerWorker:
                getSelectMetadata(
                    data,
                    config.training,
                    "dollars_per_worker"
                ),

            workersPerSupervisor:
                getSelectMetadata(
                    data,
                    config.supervisorRatio,
                    "workers_per_supervisor"
                ),

            supervisoryCompChangePct:
                getSelectMetadata(
                    data,
                    config.supervisorCompChange,
                    "percent"
                )

        };

    }

    const decisionsTable =
        getTableByIndex(5);


    function getMinimumWages(
        table
    ) {

        const result = {
            northAmerica: null,
            europeAfrica: null,
            asiaPacific: null,
            latinAmerica: null
        };

        if (!table?.rows?.[1]) {
            return result;
        }

        const row =
            table.rows[1];

        const values =
            row
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        result.northAmerica =
            values[0] ?? null;

        result.europeAfrica =
            values[1] ?? null;

        result.asiaPacific =
            values[2] ?? null;

        result.latinAmerica =
            values[3] ?? null;

        return result;

    }


    const minimumWage =
        getMinimumWages(
            decisionsTable
        );

    const priorYearTable =
        getTableByIndex(4);


    function getPriorYearMetric(
        table,
        label
    ) {

        const row =
            findRow(
                table,
                label
            );

        if (!row) {
            return null;
        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {

            northAmerica: {
                industryAverage:
                    values[0] ?? null,
                companyH:
                    values[1] ?? null
            },

            europeAfrica: {
                industryAverage:
                    values[2] ?? null,
                companyH:
                    values[3] ?? null
            },

            asiaPacific: {
                industryAverage:
                    values[4] ?? null,
                companyH:
                    values[5] ?? null
            },

            latinAmerica: {
                industryAverage:
                    values[6] ?? null,
                companyH:
                    values[7] ?? null
            }

        };

    }

    const priorBaseWages =
        getPriorYearMetric(
            priorYearTable,
            "Base Wages"
        );

    const priorIncentivePay =
        getPriorYearMetric(
            priorYearTable,
            "Incentive Pay"
        );

    const priorFringeBenefits =
        getPriorYearMetric(
            priorYearTable,
            "Fringe Benefits"
        );

    const priorRegularCompensation =
        getPriorYearMetric(
            priorYearTable,
            "Total Regular Compensation"
        );

    const priorOvertimePay =
        getPriorYearMetric(
            priorYearTable,
            "Overtime Pay"
        );

    const priorTotalCompensation =
        getPriorYearMetric(
            priorYearTable,
            "Total Compensation"
        );

    const priorIncentivePercent =
        getPriorYearMetric(
            priorYearTable,
            "Incentive Pay as a %"
        );

    const priorProductivity =
        getPriorYearMetric(
            priorYearTable,
            "Workforce Productivity"
        );

    const projectedRegularCompensation =
        getFourValues(
            decisionsTable,
            "Total Regular Compensation"
        );

    const projectedOvertimePay =
        getFourValues(
            decisionsTable,
            "Overtime Pay"
        );

    const projectedTotalCompensation =
        getFourValues(
            decisionsTable,
            "Total Compensation"
        );

    const projectedIncentivePct =
        getFourValues(
            decisionsTable,
            "Incentive Pay as %"
        );

    const supervisorTable =
        getTableByIndex(6);


    function getPriorSupervisorComp(
        table
    ) {

        const row =
            table?.rows?.[2];

        if (!row) {
            return null;
        }

        const values =
            row
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {

            northAmerica: {
                industryAverage:
                    values[0] ?? null,
                companyH:
                    values[1] ?? null
            },

            europeAfrica: {
                industryAverage:
                    values[2] ?? null,
                companyH:
                    values[3] ?? null
            },

            asiaPacific: {
                industryAverage:
                    values[4] ?? null,
                companyH:
                    values[5] ?? null
            },

            latinAmerica: {
                industryAverage:
                    values[6] ?? null,
                companyH:
                    values[7] ?? null
            }

        };

    }


    const priorSupervisorComp =
        getPriorSupervisorComp(
            supervisorTable
        );
    
    function getSupervisorMinimumSalary(
        table
    ) {

        const row =
            table?.rows?.[3];

        if (!row) {
            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };
        }

        const values =
            row
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {
            northAmerica:
                values[0] ?? null,

            europeAfrica:
                values[1] ?? null,

            asiaPacific:
                values[2] ?? null,

            latinAmerica:
                values[3] ?? null
        };

    }


    const supervisorMinimumSalary =
        getSupervisorMinimumSalary(
            supervisorTable
        );

    function getProjectedSupervisorComp(
        table
    ) {

        const row =
            findRow(
                table,
                "Supervisory Compensation (% change)"
            );

        if (!row) {
            return {
                northAmerica: null,
                europeAfrica: null,
                asiaPacific: null,
                latinAmerica: null
            };
        }

        const result = [];

        for (
            const cell of row.slice(1)
        ) {

            const text =
                String(cell);

            // Only cells that are just the resulting salary
            if (
                /^\s*[\d,]+(?:\.\d+)?\s*$/.test(
                    text
                )
            ) {

                result.push(
                    parseNumber(text)
                );

            }

        }

        return {
            northAmerica:
                result[0] ?? null,
            europeAfrica:
                result[1] ?? null,
            asiaPacific:
                result[2] ?? null,
            latinAmerica:
                result[3] ?? null
        };

    }


    const projectedSupervisorComp =
        getProjectedSupervisorComp(
            supervisorTable
        );

    const productivityTable =
        getTableByIndex(7);


    const projectedProductivity =
        getFourValues(
            productivityTable,
            "Projected Workforce Productivity"
        );


    const workersEmployed =
        getFourValues(
            productivityTable,
            "Number of Workers Employed"
        );

    const laborCostTable =
        getTableByIndex(8);


    const laborBaseWages =
        getCostPairs(
            laborCostTable,
            "Base Wages"
        );

    const laborIncentivePay =
        getCostPairs(
            laborCostTable,
            "Incentive Pay"
        );

    const laborFringeBenefits =
        getCostPairs(
            laborCostTable,
            "Fringe Benefits"
        );

    const laborOvertimePay =
        getCostPairs(
            laborCostTable,
            "Overtime Pay"
        );

    const trainingExpenditures =
        getCostPairs(
            laborCostTable,
            "Best Practices Training Expenditures"
        );

    const supervisoryLaborCost =
        getCostPairs(
            laborCostTable,
            "Supervisory Compensation"
        );

    const totalProductionLaborCost =
        getCostPairs(
            laborCostTable,
            "Total Cost of Production Labor"
        );

    function findRowByFirstCellExact(
        table,
        text
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            text.trim().toLowerCase();

        return table.rows.find(
            row =>
                String(
                    row[0] ?? ""
                )
                    .trim()
                    .toLowerCase() === target
        ) || null;

    }

    function getCostPairsFromSpecificRow(
        row
    ) {

        if (!row) {
            return {
                northAmerica: {
                    total: null,
                    perPair: null
                },
                europeAfrica: {
                    total: null,
                    perPair: null
                },
                asiaPacific: {
                    total: null,
                    perPair: null
                },
                latinAmerica: {
                    total: null,
                    perPair: null
                }
            };
        }

        const values =
            row
                .slice(1)
                .map(parseNumber)
                .filter(
                    value =>
                        value !== null
                );

        return {

            northAmerica: {
                total:
                    values[0] ?? null,
                perPair:
                    values[1] ?? null
            },

            europeAfrica: {
                total:
                    values[2] ?? null,
                perPair:
                    values[3] ?? null
            },

            asiaPacific: {
                total:
                    values[4] ?? null,
                perPair:
                    values[5] ?? null
            },

            latinAmerica: {
                total:
                    values[6] ?? null,
                perPair:
                    values[7] ?? null
            }

        };

    }

    const productionWorkerTotal =
        getCostPairsFromSpecificRow(
            findRowByFirstCellExact(
                laborCostTable,
                "Total"
            )
        );

    const projectionTable =
        getTableByIndex(3);


    function getProjectionNumber(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? parseNumber(
                row[1]
            )
            : null;

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? row[1] ?? null
            : null;

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };

    const priorYearFacilities = {};


    for (
        const region of regions
    ) {

        priorYearFacilities[
            region
        ] = {

            baseWages:
                priorBaseWages[
                    region
                ],

            incentivePay:
                priorIncentivePay[
                    region
                ],

            fringeBenefits:
                priorFringeBenefits[
                    region
                ],

            totalRegularCompensation:
                priorRegularCompensation[
                    region
                ],

            overtimePay:
                priorOvertimePay[
                    region
                ],

            totalCompensation:
                priorTotalCompensation[
                    region
                ],

            incentivePayPct:
                priorIncentivePercent[
                    region
                ],

            workforceProductivity:
                priorProductivity[
                    region
                ],

            supervisoryCompensation:
                priorSupervisorComp[
                    region
                ]

        };

    }

    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        minimumWage: {
            editable: false,
            calculated: false,
            constraint: true,
            unit: "dollars_per_worker"
        },

        projectedCompensation: {
            editable: false,
            calculated: true,

            fields: {
                regular: {
                    unit: "dollars_per_worker"
                },

                overtime: {
                    unit: "dollars_per_worker"
                },

                total: {
                    unit: "dollars_per_worker"
                },

                incentivePayPct: {
                    unit: "percent"
                }
            }
        },

        supervisory: {

            priorYear: {
                editable: false,
                historical: true
            },

            minimumSalary: {
                editable: false,
                calculated: false,
                constraint: true,
                unit: "dollars_per_supervisor"
            },

            projectedSalary: {
                editable: false,
                calculated: true,
                unit: "dollars_per_supervisor"
            }
        },

        productivity: {
            editable: false,
            calculated: true,

            fields: {
                projectedPairsPerWorker: {
                    unit: "pairs_per_worker"
                },

                workersEmployed: {
                    unit: "workers"
                }
            }
        },

        laborCosts: {
            editable: false,
            calculated: true
        }

    };

    const historicalMetadata = {

        priorYear: {
            editable: false,
            historical: true,
            comparisonData: true,

            includes: [
                "industry_average",
                "company_h"
            ]
        }

    };

    const facilities = {};


    for (
        const region of regions
    ) {

        const config =
            facilityConfig[
                region
            ];


        facilities[
            region
        ] = {

            minimumWage:
                minimumWage[
                    region
                ],


            decisions: {

                baseWageChangePct:
                    getInputNumber(
                        config.baseWageChange
                    ),

                incentivePayPerPair:
                    getInputNumber(
                        config.incentivePay
                    ),

                fringeBenefitsPerYear:
                    getInputNumber(
                        config.fringeBenefits
                    ),

                bestPracticesTrainingPerWorker:
                    getInputNumber(
                        config.training
                    ),

                workersPerSupervisor:
                    getInputNumber(
                        config.supervisorRatio
                    ),

                supervisoryCompChangePct:
                    getInputNumber(
                        config.supervisorCompChange
                    )

            },


            projectedCompensation: {

                regular:
                    projectedRegularCompensation[
                        region
                    ],

                overtime:
                    projectedOvertimePay[
                        region
                    ],

                total:
                    projectedTotalCompensation[
                        region
                    ],

                incentivePayPct:
                    projectedIncentivePct[
                        region
                    ]

            },


            supervisory: {

                priorYear:
                    priorSupervisorComp[
                        region
                    ],

                minimumSalary:
                    supervisorMinimumSalary[
                        region
                    ],

                projectedSalary:
                    projectedSupervisorComp[
                        region
                    ]

            },


            productivity: {

                projectedPairsPerWorker:
                    projectedProductivity[
                        region
                    ],

                workersEmployed:
                    workersEmployed[
                        region
                    ]

            },


            laborCosts: {

                baseWages:
                    laborBaseWages[
                        region
                    ],

                incentivePay:
                    laborIncentivePay[
                        region
                    ],

                fringeBenefits:
                    laborFringeBenefits[
                        region
                    ],

                overtimePay:
                    laborOvertimePay[
                        region
                    ],

                productionWorkersTotal:
                    productionWorkerTotal[
                        region
                    ],

                training:
                    trainingExpenditures[
                        region
                    ],

                supervisory:
                    supervisoryLaborCost[
                        region
                    ],

                totalProductionLabor:
                    totalProductionLaborCost[
                        region
                    ]

            }

        };

    }

    return {

        pageType:
            "decision",

        decisionType:
            "compensation_training",

        year,

        overallProjection,

        priorYear: {
            facilities:
                priorYearFacilities
        },

        facilities,

        decisionMetadata,

        calculatedMetadata,

        historicalMetadata

    };

}

function parseCorporateCitizenshipPage(
    data
) {

    // =================================
    // HELPERS
    // =================================

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/[$,%★,]/g, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getInputNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.selectedText ??
            input.value
        );

    }


    function getYesNo(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        const text =
            String(
                input.selectedText ?? ""
            )
                .trim()
                .toLowerCase();

        if (text === "yes") {
            return true;
        }

        if (text === "no") {
            return false;
        }

        return null;

    }


    function getTableByIndex(
        index
    ) {

        return (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === index
        ) || null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }

    // =================================
    // YEAR
    // =================================

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }

    // =================================
    // CURRENT DECISIONS
    // =================================

    const decisions = {

        recycledPackaging:
            getYesNo(
                "G475-btn"
            ),

        energyEfficiencyPerMillionCapacity:
            getInputNumber(
                "G477-btn"
            ),

        charitableContributionTotal:
            getInputNumber(
                "G479-btn"
            ),

        charitableContributionPctPretax:
            getInputNumber(
                "G480-btn"
            ),

        ethicsTraining:
            getYesNo(
                "G482-btn"
            ),

        cafeteriaChildCare:
            getYesNo(
                "G484-btn"
            ),

        safetyLightingVentilation:
            getYesNo(
                "G485-btn"
            ),

        supplierCodeOfConduct:
            getYesNo(
                "G487-btn"
            )

    };

    const decisionMetadata = {

        recycledPackaging: {
            ...getSelectMetadata(
                data,
                "G475-btn"
            ),

            type:
                "boolean"
        },

        energyEfficiencyPerMillionCapacity: {
            ...getSelectMetadata(
                data,
                "G477-btn",
                "$000s_per_million_pairs_capacity"
            ),

            meaning:
                "energy_efficiency_investment_per_million_pairs_of_production_capacity",

            calculatedTotalInvestment:
                false
        },

        charitableContributionTotal:
            getSelectMetadata(
                data,
                "G479-btn",
                "$000s"
            ),

        charitableContributionPctPretax:
            getSelectMetadata(
                data,
                "G480-btn",
                "percent"
            ),

        ethicsTraining: {
            ...getSelectMetadata(
                data,
                "G482-btn"
            ),

            type:
                "boolean"
        },

        cafeteriaChildCare: {
            ...getSelectMetadata(
                data,
                "G484-btn"
            ),

            type:
                "boolean"
        },

        safetyLightingVentilation: {
            ...getSelectMetadata(
                data,
                "G485-btn"
            ),

            type:
                "boolean"
        },

        supplierCodeOfConduct: {
            ...getSelectMetadata(
                data,
                "G487-btn"
            ),

            type:
                "boolean"
        }

    };

    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        projectedCSRCOutlays: {

            editable: false,
            calculated: true,

            fields: {

                total: {
                    unit: "$000s"
                },

                perPairSold: {
                    unit: "dollars_per_pair"
                }

            }

        }

    };



    const cashOutlayTable =
        getTableByIndex(6);


    let projectedCSRCOutlays = {
        total: null,
        perPairSold: null
    };


    const cashRow =
        cashOutlayTable?.rows?.[0];


    if (cashRow) {

        const totalCell =
            cashRow.find(
                cell =>
                    String(cell)
                        .includes(
                            "Total Cash Outlays"
                        )
            );

        const perPairCell =
            cashRow.find(
                cell =>
                    String(cell)
                        .includes(
                            "Per Pair Sold"
                        )
            );


        projectedCSRCOutlays = {

            total:
                parseNumber(
                    totalCell
                ),

            perPairSold:
                parseNumber(
                    perPairCell
                )

        };

    }

    // =================================
    // COMPANY HISTORY
    // =================================

    const historyTable =
        getTableByIndex(7);


    function parseYesNoText(
        value
    ) {

        const text =
            String(value ?? "")
                .trim()
                .toLowerCase();

        if (text === "yes") {
            return true;
        }

        if (text === "no") {
            return false;
        }

        return null;

    }


    function getHistoryRow(
        label
    ) {

        const row =
            findRow(
                historyTable,
                label
            );

        return row
            ? row.slice(1)
            : [];
    }

    const historyYears =
        (
            historyTable?.rows?.[0] || []
        )
            .slice(1)
            .map(
                value =>
                    parseNumber(value)
            );

    const recycledHistory =
        getHistoryRow(
            "Recycled Boxing"
        );

    const energyHistory =
        getHistoryRow(
            "Energy Efficiency"
        );

    const charityHistory =
        getHistoryRow(
            "Charitable Contributions"
        );

    const ethicsHistory =
        getHistoryRow(
            "Ethics Training"
        );

    const facilitiesHistoryRow =
        findRow(
            historyTable,
            "Improved Working Conditions"
        );


    const facilitiesHistory =
        facilitiesHistoryRow
            ? facilitiesHistoryRow.slice(2)
            : [];

    const safetyHistory =
        getHistoryRow(
            "Safety/Lighting"
        );

    const supplierHistory =
        getHistoryRow(
            "Supplier Code of Conduct"
        );

    const cashOutlayRow =
        findRow(
            historyTable,
            "Total Cash Outlays"
        );

    const cashOutlayHistory =
        cashOutlayRow
            ? cashOutlayRow.slice(2)
            : [];

    const perUnitHistory =
        getHistoryRow(
            "$ Per Unit Sold"
        );

    const companyHistory = {};


    historyYears.forEach(
        (
            historyYear,
            index
        ) => {

            if (
                historyYear === null
            ) {
                return;
            }

            companyHistory[
                `year_${historyYear}`
            ] = {

                recycledPackaging:
                    parseYesNoText(
                        recycledHistory[
                            index
                        ]
                    ),

                energyEfficiency:
                    parseNumber(
                        energyHistory[
                            index
                        ]
                    ),

                charitableContributions:
                    parseNumber(
                        charityHistory[
                            index
                        ]
                    ),

                ethicsTraining:
                    parseYesNoText(
                        ethicsHistory[
                            index
                        ]
                    ),

                improvedWorkingConditions:
                    parseYesNoText(
                        facilitiesHistory[
                            index
                        ]
                    ),

                safetyLighting:
                    parseYesNoText(
                        safetyHistory[
                            index
                        ]
                    ),

                supplierCodeOfConduct:
                    parseYesNoText(
                        supplierHistory[
                            index
                        ]
                    ),

                cashOutlays: {
                    total:
                        parseNumber(
                            cashOutlayHistory[
                                index
                            ]
                        ),

                    perUnitSold:
                        parseNumber(
                            perUnitHistory[
                                index
                            ]
                        )
                }

            };

        }
    );

    // =================================
    // INDUSTRY BENCHMARKS
    // =================================

    const benchmarkTable =
        getTableByIndex(8);


    const benchmarkYears =
        (
            benchmarkTable?.rows?.[0] || []
        )
            .slice(1)
            .map(parseNumber);

    function getBenchmarkValues(
        row
    ) {

        if (!row) {
            return [];
        }

        return row
            .map(parseNumber)
            .filter(
                value =>
                    value !== null
            )
            .slice(-benchmarkYears.length);

    }


    const totalHighValues =
        getBenchmarkValues(
            benchmarkTable?.rows?.[1]
        );

    const totalAverageValues =
        getBenchmarkValues(
            benchmarkTable?.rows?.[2]
        );

    const totalLowValues =
        getBenchmarkValues(
            benchmarkTable?.rows?.[3]
        );

    const perUnitHighValues =
        getBenchmarkValues(
            benchmarkTable?.rows?.[4]
        );

    const perUnitAverageValues =
        getBenchmarkValues(
            benchmarkTable?.rows?.[5]
        );

    const perUnitLowValues =
        getBenchmarkValues(
            benchmarkTable?.rows?.[6]
        );


    const industryBenchmarks = {};


    benchmarkYears.forEach(
        (
            benchmarkYear,
            index
        ) => {

            if (
                benchmarkYear === null
            ) {
                return;
            }

            industryBenchmarks[
                `year_${benchmarkYear}`
            ] = {

                totalCashOutlays: {

                    high:
                        totalHighValues[
                            index
                        ] ?? null,

                    average:
                        totalAverageValues[
                            index
                        ] ?? null,

                    low:
                        totalLowValues[
                            index
                        ] ?? null

                },

                perUnitSold: {

                    high:
                        perUnitHighValues[
                            index
                        ] ?? null,

                    average:
                        perUnitAverageValues[
                            index
                        ] ?? null,

                    low:
                        perUnitLowValues[
                            index
                        ] ?? null

                }

            };

        }
    );

    const historicalMetadata = {

        companyHistory: {
            editable: false,
            historical: true
        },

        industryBenchmarks: {
            editable: false,
            historical: true,
            comparisonData: true
        }

    };


    const projectionTable =
        getTableByIndex(3);


    function getProjectionNumber(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? parseNumber(
                row[1]
            )
            : null;

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? row[1] ?? null
            : null;

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };

    return {

        pageType:
            "decision",

        decisionType:
            "corporate_citizenship",

        year,

        overallProjection,

        decisions,

        projectedCSRCOutlays,

        companyHistory,

        industryBenchmarks,

        decisionMetadata,

        calculatedMetadata,

        historicalMetadata

    };

}

function parseCelebrityEndorsementsPage(
    data
) {

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        const text =
            String(value)
                .replace(/[$,%★,]/g, "")
                .trim();

        const match =
            text.match(
                /[-+]?\d*\.?\d+/
            );

        if (!match) {
            return null;
        }

        const number =
            Number(match[0]);

        return Number.isFinite(number)
            ? number
            : null;

    }


    function getInput(
        id
    ) {

        return (
            data.inputs || []
        ).find(
            input =>
                input.id === id
        ) || null;

    }


    function getInputNumber(
        id
    ) {

        const input =
            getInput(id);

        if (!input) {
            return null;
        }

        return parseNumber(
            input.selectedText ??
            input.value
        );

    }


    function getTableByIndex(
        index
    ) {

        return (
            data.tables || []
        ).find(
            table =>
                table.tableIndex === index
        ) || null;

    }


    function findRow(
        table,
        searchText
    ) {

        if (!table?.rows) {
            return null;
        }

        const target =
            searchText.toLowerCase();

        return table.rows.find(
            row =>
                row.some(
                    cell =>
                        String(cell)
                            .toLowerCase()
                            .includes(target)
                )
        ) || null;

    }


    function slugCelebrity(
        name
    ) {

        const words =
            String(name)
                .replace(
                    /[^a-zA-Z0-9 ]/g,
                    ""
                )
                .trim()
                .split(/\s+/);

        if (!words.length) {
            return "";
        }

        return (
            words[0].charAt(0)
                .toLowerCase() +
            words[0].slice(1) +
            words
                .slice(1)
                .map(
                    word =>
                        word.charAt(0)
                            .toUpperCase() +
                        word.slice(1)
                )
                .join("")
        );

    }

    // Celebrity offer inputs are dynamic by year.
    // BSG only renders offer inputs for celebrities currently available for offer.
    // Preserve DOM order and map them to "NOW" celebrity rows in table order.
    const celebrityOfferInputs = (
        data.inputs || []
    ).filter(input =>
        input.id?.startsWith("entry-input-G") &&
        input.id !== "entry-input-G464"
    );
    

    let year = null;

    for (
        const heading of
        data.headings || []
    ) {

        const match =
            heading.match(
                /DECISION ENTRIES\s*[–-]\s*YEAR\s*(\d+)/i
            );

        if (match) {

            year =
                Number(match[1]);

            break;

        }

    }


    const celebrityTable =
        getTableByIndex(4);

    const celebrities = {};

    const celebrityRows =
        celebrityTable?.rows
            ?.slice(2) || [];
    

    let offerInputIndex = 0;


    celebrityRows.forEach(
        row => {

            if (
                !row ||
                row.length < 9
            ) {
                return;
            }


            const name =
                row[0];

            const key =
                slugCelebrity(
                    name
                );


            const signedBy =
                row[5] ?? null;


            const unsigned =
                String(
                    signedBy
                )
                    .toLowerCase()
                    .includes(
                        "unsigned"
                    );


            const availableForOffer =
                row[8] ?? null;


            const isAvailableNow =
                String(availableForOffer)
                    .trim()
                    .toUpperCase() === "NOW";

            const offerInput =
                isAvailableNow
                    ? celebrityOfferInputs[
                        offerInputIndex++
                    ] ?? null
                    : null;

            const offerInputId =
                offerInput?.id ?? null;


            const currentOffer =
                offerInput
                    ? getInputNumber(
                        offerInputId
                    )
                    : null;


            celebrities[key] = {

                name,

                offerInputId:
                    offerInput
                        ? offerInputId
                        : null,

                appeal: {

                    northAmerica:
                        parseNumber(
                            row[1]
                        ),

                    europeAfrica:
                        parseNumber(
                            row[2]
                        ),

                    asiaPacific:
                        parseNumber(
                            row[3]
                        ),

                    latinAmerica:
                        parseNumber(
                            row[4]
                        )

                },

                contract: {

                    signed:
                        !unsigned,

                    signedBy:
                        unsigned
                            ? null
                            : signedBy,

                    annualAmount:
                        parseNumber(
                            row[6]
                        ),

                    lengthYears:
                        parseNumber(
                            row[7]
                        ),

                    availableForOffer

                },

                currentOffer,

                availableForOffer

            };

        }
    );

    if (offerInputIndex !== celebrityOfferInputs.length) {
        console.warn(
            "Celebrity offer input mapping mismatch:",
            {
                mappedInputs: offerInputIndex,
                availableInputs: celebrityOfferInputs.length
            }
        );
    }

    const decisionMetadata = {

        celebrityOffers: {}

    };


    for (
        const [
            key,
            celebrity
        ] of Object.entries(
            celebrities
        )
    ) {

        decisionMetadata
            .celebrityOffers[key] = {

            name:
                celebrity.name,

            offer:
                celebrity.offerInputId
                    ? getInputMetadata(
                        data,
                        celebrity.offerInputId,
                        "$000s_per_year"
                    )
                    : {
                        editable: false,
                        unit: "$000s_per_year",
                        min: null,
                        max: null,
                        step: null
                    },

            meaning:
                "annual_endorsement_offer",

        };

    }


    const spendingCap =
        getInputNumber(
            "entry-input-G464"
        );
    

    const sumOfCurrentOffers =
        Object.values(
            celebrities
        )
            .reduce(
                (
                    total,
                    celebrity
                ) => {

                    return (
                        total +
                        (
                            celebrity
                                .currentOffer ||
                            0
                        )
                    );

                },
                0
            );

    const spending = {

        spendingCap,

        sumOfCurrentOffers

    };

    decisionMetadata.spendingCap = {

        ...getInputMetadata(
            data,
            "entry-input-G464",
            "$000s"
        ),

        meaning:
            "maximum_total_annual_spending_on_new_celebrity_contracts",

        notCelebrityOffer:
            true

    };


    const calculatedMetadata = {

        overallProjection: {
            editable: false,
            calculated: true
        },

        sumOfCurrentOffers: {
            editable: false,
            calculated: true,
            unit: "$000s_per_year"
        },

        celebrityData: {

            appeal: {
                editable: false,
                calculated: false,
                context: true
            },

            contract: {
                editable: false,
                calculated: false,
                context: true
            }

        }

    };

    const historicalMetadata = {

        recentOffers: {

            editable: false,

            historical: true,

            comparisonData: true,

            meaning:
                "recent_competing_offers_for_each_celebrity"

        }

    };

    const projectionTable =
        getTableByIndex(3);


    function getProjectionNumber(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? parseNumber(
                row[1]
            )
            : null;

    }


    function getProjectionText(
        label
    ) {

        const row =
            findRow(
                projectionTable,
                label
            );

        return row
            ? row[1] ?? null
            : null;

    }


    const overallProjection = {

        earningsPerShare:
            getProjectionNumber(
                "Earnings Per Share"
            ),

        returnOnEquity:
            getProjectionNumber(
                "Return On Equity"
            ),

        creditRating:
            getProjectionText(
                "Credit Rating"
            ),

        imageRating:
            getProjectionNumber(
                "Image Rating"
            ),

        netRevenues:
            getProjectionNumber(
                "Net Revenues"
            ),

        netProfit:
            getProjectionNumber(
                "Net Profit"
            ),

        endingCash:
            getProjectionNumber(
                "Ending Cash"
            )

    };

    function parseOffer(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {
            return {
                amount: null,
                company: null
            };
        }

        const text =
            String(value)
                .trim();


        const amount =
            parseNumber(text);


        const companyMatch =
            text.match(
                /\(([A-Z])\)/
            );


        return {

            amount:
                amount ?? 0,

            company:
                companyMatch
                    ? companyMatch[1]
                    : null

        };

    }

    const recentOfferTable =
        getTableByIndex(5);


    const recentOffers = {};


    const recentRows =
        recentOfferTable?.rows
            ?.slice(1) || [];


    recentRows.forEach(
        row => {

            if (
                !row ||
                row.length < 5
            ) {
                return;
            }

            const name =
                row[0];

            const key =
                slugCelebrity(name);


            recentOffers[key] = {

                name,

                numberOfOffers:
                    parseNumber(
                        row[1]
                    ),

                highest:
                    parseOffer(
                        row[2]
                    ),

                secondHighest:
                    parseOffer(
                        row[3]
                    ),

                thirdHighest:
                    parseOffer(
                        row[4]
                    )

            };

        }
    );

    const rules = {

        maxContractsPerYear:
            2,

        regionalAppealCap:
            300,

        minimumAnnualOffer:
            500,

        maximumAnnualOffer:
            75000

    };

    const constraintMetadata = {

        maxContractsPerYear: {
            value:
                rules.maxContractsPerYear,
            constraint: true,
            unit: "contracts"
        },

        regionalAppealCap: {
            value:
                rules.regionalAppealCap,
            constraint: true,
            unit: "appeal_points"
        },

        minimumAnnualOffer: {
            value:
                rules.minimumAnnualOffer,
            constraint: true,
            unit: "$000s_per_year"
        },

        maximumAnnualOffer: {
            value:
                rules.maximumAnnualOffer,
            constraint: true,
            unit: "$000s_per_year"
        }

    };

    return {

        pageType:
            "decision",

        decisionType:
            "celebrity_endorsements",

        year,

        overallProjection,

        celebrities,

        spending,

        recentOffers,

        rules,

        decisionMetadata,

        calculatedMetadata,

        historicalMetadata,

        constraintMetadata

};

}



// #endregion

// #region Main Extractor

function extractBSGData(
    debug = false
) {

    const data = {

        website: "BSG",

        timestamp:
            new Date().toISOString(),

        url:
            window.location.href,

        pageTitle:
            document.title,
            
        pageText:
            debug
                ? cleanText(
                    document.body?.innerText || ""
                )
                : null,

        headings:
            [],

        inputs:
            [],

        tables:
            []

    };

    data.headings =
        Array.from(
            document.querySelectorAll(
                "h1, h2, h3, h4"
            )
        )
        .map(element =>
            cleanText(
                element.innerText
            )
        )
        .filter(Boolean);

    data.inputs =
        Array.from(
            document.querySelectorAll(
                "input, select, textarea"
            )
        )
        .map(
            (element, index) => {

                let value = null;
                let selectedText = null;

                if (
                    element.type ===
                    "checkbox"
                ) {

                    value =
                        element.checked;

                }
                else if (
                    element.type ===
                    "radio"
                ) {

                    value =
                        element.checked
                            ? element.value
                            : null;

                }
                else {

                    value =
                        element.value;
                }

                if (
                    element.tagName ===
                    "SELECT"
                ) {

                    const selectedOption =
                        element.options[
                            element.selectedIndex
                        ];

                    selectedText =
                        selectedOption
                            ? cleanText(
                                selectedOption.textContent
                            )
                            : null;

                }


                return {

                    index,

                    tag:
                        element.tagName
                            .toLowerCase(),

                    type:
                        element.type || null,

                    id:
                        element.id || null,

                    name:
                        element.name || null,

                    value,

                    selectedText,

                    options:
                        element.tagName === "SELECT"
                            ? Array.from(
                                element.options
                            ).map(
                                option => ({
                                    value:
                                        option.value,

                                    label:
                                        option.textContent
                                            .trim(),

                                    selected:
                                        option.selected,

                                    disabled:
                                        option.disabled
                                })
                            )
                            : null,

                    min:
                        element.getAttribute(
                            "min"
                        ),

                    max:
                        element.getAttribute(
                            "max"
                        ),

                    step:
                        element.getAttribute(
                            "step"
                        ),

                    disabled:
                        element.disabled,

                    readOnly:
                        element.readOnly

                };
            }
        );
        

    const tables = document.querySelectorAll("table");

    tables.forEach((table, index) => {

        const captionElement =
            table.querySelector("caption");

        const caption = captionElement
            ? cleanText(captionElement.innerText)
            : "";

        const captionLower =
            caption.toLowerCase();


        // --------------------------
        // YEAR SCOREBOARD
        // --------------------------

        if (captionLower.includes("year scoreboard")) {

            data.tables.push({

                type: "year_scoreboard",

                tableIndex: index,

                caption,

                companies:
                    parseScoreboard(table)

            });

            return;
        }


        // --------------------------
        // GAME-TO-DATE SCOREBOARD
        // --------------------------

        if (
            captionLower.includes(
                "game-to-date scoreboard"
            )
        ) {

            data.tables.push({

                type: "game_to_date_scoreboard",

                tableIndex: index,

                caption,

                companies:
                    parseGameToDateScoreboard(table)

            });

            return;
        }


        // --------------------------
        // COMPETITIVE EFFORTS
        // --------------------------

        if (
            captionLower.includes(
                "comparative competitive efforts"
            )
        ) {

            data.tables.push({

                type:
                    "comparative_competitive_efforts",

                tableIndex: index,

                caption,

                data:
                    parseComparativeCompetitiveEfforts(
                        table
                    )

            });

            return;
        }

        // --------------------------
        // STRATEGIC GROUP MAPS
        // --------------------------

        if (
            isStrategicGroupMapTable(
                table
            )
        ) {

            let segment =
                "unknown";

            /*
                On this BSG page:

                table 2 = Internet Strategic Group Map
                table 3 = Wholesale Strategic Group Map
            */

            if (index === 2) {
                segment =
                    "internet";
            }
            else if (index === 3) {
                segment =
                    "wholesale";
            }

            data.tables.push({

                type:
                    "strategic_group_map",

                tableIndex:
                    index,

                segment,

                data:
                    parseStrategicGroupMap(
                        table,
                        segment
                    )

            });

            return;
        }


        // --------------------------
        // EVERYTHING ELSE
        // --------------------------

        const tableData =
            parseGenericTable(
                table
            );

        if (
            tableData.length > 0
        ) {

            data.tables.push({

                type:
                    "unknown",

                tableIndex:
                    index,

                caption,

                rows:
                    tableData

            });

        }

    });


    if (
        window.location.pathname.includes(
            "/users/lobby/"
        )
    ) {

        data.currentRound =
            parseCorporateLobbyPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/internet-marketing"
        )
    ) {

        data.currentRound =
            parseInternetMarketingPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/wholesale-marketing"
        )
    ) {

        data.currentRound =
            parseWholesaleMarketingPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/finance"
        )
    ) {

        data.currentRound =
            parseFinanceCashFlowPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/branded-production"
        )
    ) {

        data.currentRound =
            parseBrandedProductionPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/production-equipment"
        )
    ) {

        data.currentRound =
            parseProductionFacilitiesPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/dist-ops"
        )
    ) {

        data.currentRound =
            parseDistributionWarehousePage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/private-label"
        )
    ) {

        data.currentRound =
            parsePrivateLabelPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/comp-training"
        )
    ) {

        data.currentRound =
            parseCompensationTrainingPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/csrc"
        )
    ) {

        data.currentRound =
            parseCorporateCitizenshipPage(
                data
            );

    }

    if (
        window.location.pathname.includes(
            "/decisions/celebrities"
        )
    ) {

        data.currentRound =
            parseCelebrityEndorsementsPage(
                data
            );

    }
    //end of routes

    if (
            data.currentRound &&
            !debug
        ) {

            delete data.pageText;
            delete data.inputs;
            delete data.tables;

        }
    return data;
}

// #endregion


// #region Message handler
// ==============================
// MESSAGE HANDLER
// ==============================

chrome.runtime.onMessage.addListener(

    (request, sender, sendResponse) => {

        console.log(
            "Content script received:",
            request
        );

        if (
            request.action !==
            "extractBSGData"
        ) {
            return;
        }

        try {

            console.log(
                "Running extractBSGData..."
            );

            const data =
                extractBSGData(true);

            console.log(
                "Extraction complete:",
                data
            );

            sendResponse({
                success: true,
                data
            });

        }
        catch (error) {

            console.error(
                "BSG extraction failed:",
                error
            );

            sendResponse({
                success: false,
                error:
                    error?.message ||
                    String(error)
            });

        }

    }

);

// #endregion
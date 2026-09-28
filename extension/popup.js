//#region CSV import helpers



// ==========================================
// FILE IMPORT QUEUE
// ==========================================

let csvImportQueue = [];


function addFilesToQueue(files) {

    files.forEach(file => {

        const alreadyExists =
            csvImportQueue.some(existing =>
                existing.name === file.name &&
                existing.size === file.size &&
                existing.lastModified === file.lastModified
            );

        if (!alreadyExists) {
            csvImportQueue.push(file);
        }

    });

    displayFileQueue();
}


function displayFileQueue() {

    const container =
        document.getElementById("selectedFiles");

    if (csvImportQueue.length === 0) {

        container.innerHTML =
            "No files selected.";

        return;
    }

    let html =
        `<strong>${csvImportQueue.length} file(s) queued:</strong><br>`;

    csvImportQueue.forEach(file => {

        html +=
            `<div class="loaded-item">${file.name}</div>`;

    });

    container.innerHTML = html;
}


// ==========================================
// BASIC CSV PARSER
// ==========================================

function parseCSV(text) {

    const rows = [];

    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        if (char === '"') {

            if (
                insideQuotes &&
                text[i + 1] === '"'
            ) {
                cell += '"';
                i++;
            }
            else {
                insideQuotes = !insideQuotes;
            }

        }

        else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(cell.trim());

            cell = "";

        }

        else if (
            (char === "\n" || char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                text[i + 1] === "\n"
            ) {
                i++;
            }

            row.push(cell.trim());

            if (
                row.some(value =>
                    value !== ""
                )
            ) {
                rows.push(row);
            }

            row = [];
            cell = "";

        }

        else {

            cell += char;

        }

    }


    if (
        cell.length > 0 ||
        row.length > 0
    ) {

        row.push(cell.trim());

        if (
            row.some(value =>
                value !== ""
            )
        ) {
            rows.push(row);
        }

    }


    return rows;
}


function parseNumericValue(value) {

    if (value === null || value === undefined) {
        return null;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/%/g, "")
        .replace(/★/g, "")
        .replace(/\$/g, "")
        .replace(/pts\./gi, "")
        .replace(/wks?/gi, "")
        .trim();

    const number =
        parseFloat(cleaned);

    return isNaN(number)
        ? null
        : number;
}


// ==========================================
// COMMON NORMALIZATION HELPERS
// ==========================================

function cleanBSGText(value) {

    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}


function parseBSGValue(value) {

    const text =
        cleanBSGText(value);

    if (text === "") {
        return null;
    }


    // Yes / No
    if (text.toLowerCase() === "yes") {
        return true;
    }

    if (text.toLowerCase() === "no") {
        return false;
    }


    // Numeric values
    const cleaned =
        text
            .replace(/,/g, "")
            .replace(/\$/g, "")
            .replace(/%/g, "")
            .replace(/★/g, "")
            .trim();


    // Only convert when the entire cleaned value
    // reasonably resembles a number.
    if (
        /^[-+]?\d*\.?\d+$/.test(cleaned)
    ) {

        const number =
            Number(cleaned);

        if (!isNaN(number)) {
            return number;
        }

    }


    // Otherwise preserve text.
    return text;
}


function rowHasData(row) {

    return row.some(cell =>
        cleanBSGText(cell) !== ""
    );
}


function getRowLabel(
    row,
    startColumn = 1,
    endColumn = 5
) {

    const parts = [];

    for (
        let i = startColumn;
        i <= endColumn;
        i++
    ) {

        const value =
            cleanBSGText(row[i]);

        if (value !== "") {
            parts.push(value);
        }

    }

    return parts.join(" | ");
}


function getIndexedValues(
    row,
    startColumn = 6
) {

    const values = {};

    for (
        let i = startColumn;
        i < row.length;
        i++
    ) {

        const raw =
            cleanBSGText(row[i]);

        if (raw === "") {
            continue;
        }


        values[i] =
            parseBSGValue(raw);

    }

    return values;
}


// ==========================================
// FIR NORMALIZER
// ==========================================

function normalizeFIR(rows) {

    const output = {

        metadata: {},

        companies: {},

        pages: {}

    };


    const companyLetters = [
        "A", "B", "C", "D",
        "E", "F", "G", "H",
        "I", "J", "K", "L"
    ];


    // ======================================
    // METADATA
    // ======================================

    rows.forEach(row => {

        const first =
            cleanBSGText(row[0]);

        const label =
            cleanBSGText(row[1]);


        if (first === "ID DATA") {

            output.metadata.industry =
                parseBSGValue(row[6]);

        }


        if (label === "Year") {

            output.metadata.year =
                parseBSGValue(row[6]);

        }


        if (
            label === "Number of Companies"
        ) {

            output.metadata.numberOfCompanies =
                parseBSGValue(row[6]);

        }


        if (
            label === "Bonus Points"
        ) {

            output.metadata.bonusPoints =
                parseBSGValue(row[6]);

        }


        if (label === "Practice") {

            output.metadata.practice =
                parseBSGValue(row[6]);

        }

    });


    // ======================================
    // COMPANY DIRECTORY
    // ======================================

    rows.forEach(row => {

        const companyLetter =
            cleanBSGText(row[5]);

        if (
            !companyLetters.includes(
                companyLetter
            )
        ) {
            return;
        }


        const companyNumber =
            parseBSGValue(row[4]);

        const companyName =
            cleanBSGText(row[7]);


        if (
            companyNumber === null ||
            companyName === ""
        ) {
            return;
        }


        output.companies[
            companyLetter
        ] = {

            number:
                companyNumber,

            letter:
                companyLetter,

            name:
                companyName

        };

    });


    // ======================================
    // PAGE NAMES
    // ======================================

    const pageNames = {

        "PAGE 1":
            "scoreboard",

        "PAGE 2":
            "eps_roe_stock_price",

        "PAGE 3":
            "credit_image_csrc",

        "PAGE 3b":
            "bonus_awards",

        "PAGE 4":
            "industry_overview",

        "PAGE 5":
            "financial_statistics",

        "PAGE 6":
            "production_benchmarks",

        "PAGE 7":
            "operating_benchmarks",

        "PAGE 8":
            "celebrity_and_price_trends"

    };


    let currentPage = null;


    rows.forEach(
        (row, rowIndex) => {

            if (!rowHasData(row)) {
                return;
            }


            const first =
                cleanBSGText(row[0]);


            // ------------------------------
            // PAGE START
            // ------------------------------

            if (pageNames[first]) {

                currentPage =
                    pageNames[first];


                if (
                    !output.pages[
                        currentPage
                    ]
                ) {

                    output.pages[
                        currentPage
                    ] = {

                        pageCode:
                            first,

                        rows: []

                    };

                }

            }


            if (!currentPage) {
                return;
            }


            const normalizedRow = {

                sourceRow:
                    rowIndex,

                label:
                    getRowLabel(
                        row,
                        1,
                        5
                    ),

                values:
                    getIndexedValues(
                        row,
                        6
                    )

            };


            // ------------------------------
            // COMPANY A-L VALUES
            // ------------------------------

            const companyValues = {};

            let companyValueCount = 0;


            companyLetters.forEach(
                (company, index) => {

                    const column =
                        6 + index;

                    const raw =
                        cleanBSGText(
                            row[column]
                        );


                    if (raw === "") {
                        return;
                    }


                    companyValues[
                        company
                    ] =
                        parseBSGValue(
                            raw
                        );


                    companyValueCount++;

                }
            );


            /*
             * Only call it a company matrix if
             * multiple company columns actually
             * contain data.
             */
            if (
                companyValueCount >= 3
            ) {

                normalizedRow
                    .companyValues =
                    companyValues;

            }


            // Store first-column text when useful
            if (
                first !== "" &&
                !first.startsWith("PAGE")
            ) {

                normalizedRow.context =
                    first;

            }


            output.pages[
                currentPage
            ].rows.push(
                normalizedRow
            );

        }
    );


    return output;
}

// ==========================================
// COR SECTION DETECTION
// ==========================================

function detectCORSection(
    rows,
    index
) {

    const first0 =
        cleanBSGText(
            rows[index]?.[0]
        ).toUpperCase();

    const first1 =
        cleanBSGText(
            rows[index + 1]?.[0]
        ).toUpperCase();

    const first2 =
        cleanBSGText(
            rows[index + 2]?.[0]
        ).toUpperCase();


    const combined2 =
        [first0, first1]
            .filter(Boolean)
            .join(" ");


    const combined3 =
        [first0, first1, first2]
            .filter(Boolean)
            .join(" ");


    // --------------------------------------
    // FACILITIES
    // --------------------------------------

    if (
        first0 === "FACILITIES"
    ) {
        return "facilities";
    }


    // --------------------------------------
    // PRODUCTION
    // --------------------------------------

    if (
        first0 === "PRODUCTION" &&
        combined3.includes(
            "PRODUCTION AND WORKFORCE"
        )
    ) {
        return "production_workforce";
    }


    if (
        first0 === "BRANDED" &&
        combined3.includes(
            "BRANDED FOOTWEAR PRODUCTION"
        )
    ) {
        return "branded_production";
    }


    // --------------------------------------
    // DISTRIBUTION
    // --------------------------------------

    if (
        first0 === "DISTRIBUTION" &&
        combined3.includes(
            "DISTRIBUTION AND WAREHOUSE"
        )
    ) {
        return "distribution_warehouse";
    }


    // --------------------------------------
    // CELEBRITIES
    // --------------------------------------

    if (
        first0 === "CELEBRITY" &&
        combined3.includes(
            "CELEBRITY ENDORSEMENTS"
        )
    ) {
        return "celebrity_endorsements";
    }


    // --------------------------------------
    // RETAIL OUTLETS
    // --------------------------------------

    if (
        first0 === "RETAIL" &&
        combined3.includes(
            "RETAIL OUTLETS AVAILABLE"
        )
    ) {
        return "retail_outlets";
    }


    // --------------------------------------
    // INTERNET
    // --------------------------------------

    if (
        first0 === "INTERNET" &&
        combined3.includes(
            "INTERNET MARKETING EXPENSES"
        )
    ) {
        return "internet_marketing";
    }


    if (
        first0 === "INTERNET" &&
        combined3.includes(
            "INTERNET MARKET PERFORMANCE"
        )
    ) {
        return "internet_market_performance";
    }


    // --------------------------------------
    // WHOLESALE
    // --------------------------------------

    if (
        first0 === "WHOLESALE" &&
        combined3.includes(
            "WHOLESALE MARKETING EXPENSES"
        )
    ) {
        return "wholesale_marketing";
    }


    if (
        first0 === "WHOLESALE" &&
        combined3.includes(
            "WHOLESALE MARKET PERFORMANCE"
        )
    ) {
        return "wholesale_market_performance";
    }


    // --------------------------------------
    // ADMIN
    // --------------------------------------

    if (
        first0 === "ADMINISTRATIVE" &&
        combined2.includes(
            "ADMINISTRATIVE EXPENSES"
        )
    ) {
        return "administrative_expenses";
    }


    // --------------------------------------
    // PRIVATE LABEL
    // --------------------------------------

    if (
        (
            first0 === "PRIVATE-LABEL" ||
            first0 === "PRIVATE LABEL"
        ) &&
        combined3.includes(
            "PAIRS PRODUCED"
        )
    ) {
        return "private_label_production";
    }


    if (
        (
            first0 === "PRIVATE-LABEL" ||
            first0 === "PRIVATE LABEL" ||
            first0 === "PRIVATE"
        ) &&
        (
            combined3.includes(
                "PRIVATE LABEL OPERATIONS"
            ) ||
            combined3.includes(
                "PRIVATE-LABEL OPERATIONS"
            )
        )
    ) {
        return "private_label_operations";
    }


    // --------------------------------------
    // FINANCIAL STATEMENTS
    // --------------------------------------

    if (
        first0 === "INCOME" &&
        combined2.includes(
            "INCOME STATEMENT"
        )
    ) {
        return "income_statement";
    }

    if (
        first0 === "CASH FLOW" &&
        (
            combined2.includes(
                "CASH FLOW STATEMENT"
            ) ||
            combined3.includes(
                "CASH FLOW STATEMENT"
            )
        )
    ) {
    return "cash_flow";
    }


    ///extra cash flow checker///


    if (
        first0 === "CASH" &&
        (
            combined3.includes(
                "CASH FLOW STATEMENT"
            ) ||
            combined3.includes(
                "CASH FLOW"
            )
        )
    ) {
        return "cash_flow";
    }


    if (
        first0 === "BALANCE" &&
        combined2.includes(
            "BALANCE SHEET"
        )
    ) {
        return "balance_sheet";
    }


    // --------------------------------------
    // STOCK / CREDIT
    // --------------------------------------

    if (
    first0 === "STOCK" &&
        (
            combined3.includes(
                "STOCK ISSUES AND REPURCHASES"
            ) ||
            combined3.includes(
                "STOCK ISSUES"
            ) ||
            combined3.includes(
                "REPURCHASES"
            )
        )
    ) {
        return "stock";
}


    if (
        first0 === "CREDIT" &&
        combined2.includes(
            "CREDIT RATING"
        )
    ) {
        return "credit_rating";
    }


    if (
        first0 === "INTEREST" &&
        combined2.includes(
            "INTEREST RATES"
        )
    ) {
        return "interest_rates";
    }


    // --------------------------------------
    // OTHER FINANCIAL DATA
    // --------------------------------------

    if (
        first0 === "SELECTED" &&
        combined2.includes(
            "SELECTED FINANCIALS"
        )
    ) {
        return "selected_financials";
    }


    if (
        first0 === "LONG-TERM" &&
        combined3.includes(
            "LONG-TERM BANK LOANS"
        )
    ) {
        return "long_term_loans";
    }


    // --------------------------------------
    // CSR / IMAGE
    // --------------------------------------

    if (
        first0 === "CORPORATE" &&
        combined3.includes(
            "CORPORATE SOCIAL RESPONSIBILITY"
        )
    ) {
        return "corporate_social_responsibility";
    }


    if (
        first0 === "IMAGE" &&
        combined2.includes(
            "IMAGE RATING"
        )
    ) {
        return "image_rating";
    }


    return null;
}


// ==========================================
// COR NORMALIZER
// ==========================================

// ==========================================
// COR NORMALIZER
// ==========================================

function normalizeCOR(rows) {

    const output = {

        metadata: {},

        sections: {}

    };


    const regions = [
        "North America",
        "Europe-Africa",
        "Asia-Pacific",
        "Latin America",
        "Overall"
    ];


    // ======================================
    // METADATA
    // ======================================

    output.metadata = {

        industry: null,

        companyNumber: null,

        companyLetter: null,

        companyName: null,

        year: null,

        practice: null,

        projected: null

    };


    // Use label-based metadata detection
    // instead of assuming fixed row numbers.

    rows.forEach(row => {

        const cells =
            row.map(cell =>
                cleanBSGText(cell)
            );


        for (
            let i = 0;
            i < cells.length;
            i++
        ) {

            const label =
                cells[i].toLowerCase();


            if (
                label.includes(
                    "industry number"
                )
            ) {

                output.metadata.industry =
                    parseBSGValue(
                        findNextValue(
                            cells,
                            i + 1
                        )
                    );

            }


            else if (
                label.includes(
                    "company number"
                )
            ) {

                output.metadata.companyNumber =
                    parseBSGValue(
                        findNextValue(
                            cells,
                            i + 1
                        )
                    );

            }


            else if (
                label.includes(
                    "company letter"
                ) ||
                label.includes(
                    "compan letter"
                )
            ) {

                output.metadata.companyLetter =
                    findNextValue(
                        cells,
                        i + 1
                    );

            }


            else if (
                label.includes(
                    "company name"
                )
            ) {

                output.metadata.companyName =
                    findNextValue(
                        cells,
                        i + 1
                    );

            }


            else if (
                label === "year"
            ) {

                output.metadata.year =
                    parseBSGValue(
                        findNextValue(
                            cells,
                            i + 1
                        )
                    );

            }

        }

    });


    let currentSection = null;

    let currentRegion = null;


    rows.forEach(
        (row, rowIndex) => {

            if (!rowHasData(row)) {
                return;
            }


            // ==================================
            // DETECT REPORT SECTION
            // ==================================

            const detectedSection =
                detectCORSection(
                    rows,
                    rowIndex
                );


            if (detectedSection) {

                currentSection =
                    detectedSection;


                /*
                 * IMPORTANT:
                 * A new section must start with
                 * no active region.
                 */
                currentRegion = null;


                if (
                    !output.sections[
                        currentSection
                    ]
                ) {

                    output.sections[
                        currentSection
                    ] = {

                        rows: [],

                        regions: {}

                    };

                }

            }


            if (!currentSection) {
                return;
            }


            const first =
                cleanBSGText(
                    row[0]
                );


            // ==================================
            // REGION DETECTION
            // ==================================

            const region =
                regions.find(region =>
                    first === region ||
                    first.startsWith(
                        region + " "
                    )
                );


            if (region) {

                currentRegion =
                    region;


                if (
                    !output
                        .sections[
                            currentSection
                        ]
                        .regions[
                            currentRegion
                        ]
                ) {

                    output
                        .sections[
                            currentSection
                        ]
                        .regions[
                            currentRegion
                        ] = [];

                }

            }


            // ==================================
            // CREATE NORMALIZED ROW
            // ==================================

            const normalizedRow = {

                sourceRow:
                    rowIndex,

                label:
                    getRowLabel(
                        row,
                        1,
                        5
                    ),

                values:
                    getIndexedValues(
                        row,
                        6
                    )

            };


            if (first !== "") {

                normalizedRow.context =
                    first;

            }


            if (currentRegion) {

                normalizedRow.region =
                    currentRegion;

            }


            // ==================================
            // IGNORE EMPTY ROWS
            // ==================================

            if (
                normalizedRow.label === "" &&
                Object.keys(
                    normalizedRow.values
                ).length === 0
            ) {

                return;

            }


            // ==================================
            // ADD TO SECTION
            // ==================================

            output
                .sections[
                    currentSection
                ]
                .rows
                .push(
                    normalizedRow
                );


            // ==================================
            // ADD TO REGION
            // ==================================

            if (currentRegion) {

                /*
                 * Defensive check:
                 * make sure the region array
                 * exists before pushing.
                 */

                if (
                    !output
                        .sections[
                            currentSection
                        ]
                        .regions[
                            currentRegion
                        ]
                ) {

                    output
                        .sections[
                            currentSection
                        ]
                        .regions[
                            currentRegion
                        ] = [];

                }


                output
                    .sections[
                        currentSection
                    ]
                    .regions[
                        currentRegion
                    ]
                    .push(
                        normalizedRow
                    );

            }

        }
    );


    return output;
}


function normalizeMetricName(metric) {

    const text =
        metric
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();


    if (text.includes("retail price")) {
        return "price";
    }

    if (text.includes("wholesale price")) {
        return "price";
    }

    if (text.includes("search engine advertising")) {
        return "searchAdvertising";
    }

    if (text.includes("free shipping")) {
        return "freeShipping";
    }

    if (text.includes("s/q rating")) {
        return "sqRating";
    }

    if (text.includes("model availability")) {
        return "models";
    }

    if (text.includes("brand advertising")) {
        return "brandAdvertising";
    }

    if (text.includes("celebrity appeal")) {
        return "celebrityAppeal";
    }

    if (text.includes("brand reputation")) {
        return "brandReputation";
    }

    if (text.includes("online orders")) {
        return "onlineOrders";
    }

    if (
        text.includes("pairs demanded")
    ) {
        return "pairsDemanded";
    }

    if (
        text.includes("gained / lost")
    ) {
        return "stockoutEffect";
    }

    if (
        text.includes("pairs sold")
    ) {
        return "pairsSold";
    }

    if (
        text.includes("market share")
    ) {
        return "marketShare";
    }

    if (
        text.includes("rebate offer")
    ) {
        return "rebate";
    }

    if (
        text.includes("delivery time")
    ) {
        return "deliveryTime";
    }

    if (
        text.includes("retailer support")
    ) {
        return "retailerSupport";
    }

    if (
        text.includes("retail outlets") ||
        text.includes("retailer outlets")
    ) {
        return "retailerOutlets";
    }

    if (
        text.includes("offer price")
    ) {
        return "offerPrice";
    }

    if (
        text.includes("pairs offered")
    ) {
        return "pairsOffered";
    }

    return null;
}

function normalizeCIR(rows) {

    const output = {
        regions: {}
    };

    const regions = [
        {
            name: "North America",
            startColumn: 3
        },
        {
            name: "Europe-Africa",
            startColumn: 17
        },
        {
            name: "Asia-Pacific",
            startColumn: 31
        },
        {
            name: "Latin America",
            startColumn: 45
        }
    ];

    const companies = [
        "A", "B", "C", "D",
        "E", "F", "G", "H",
        "I", "J", "K", "L"
    ];


    // -----------------------------------------
    // CREATE REGION STRUCTURE
    // -----------------------------------------

    regions.forEach(region => {

        output.regions[region.name] = {
            internet: {},
            wholesale: {},
            private_label: {}
        };

        companies.forEach(company => {

            output.regions[region.name]
                .internet[company] = {};

            output.regions[region.name]
                .wholesale[company] = {};

            output.regions[region.name]
                .private_label[company] = {};

        });

    });


    let currentSegment = null;


    rows.forEach(row => {

        const segmentCell =
            String(row[0] || "")
                .trim()
                .toUpperCase();

        const metricCell =
            String(row[1] || "")
                .trim();


        // -----------------------------------------
        // DETECT SEGMENT
        // -----------------------------------------

        if (segmentCell === "INTERNET") {

            currentSegment = "internet";

        }

        else if (
            segmentCell === "WHOLESALE"
        ) {

            currentSegment = "wholesale";

        }

        else if (
            segmentCell === "PRIVATE-LABEL"
        ) {

            currentSegment = "private_label";

        }


        if (
            !currentSegment ||
            !metricCell
        ) {
            return;
        }


        // -----------------------------------------
        // NORMALIZE METRIC NAME
        // -----------------------------------------

        const metricName =
            normalizeMetricName(
                metricCell
            );


        if (!metricName) {
            return;
        }


        // -----------------------------------------
        // READ EACH REGION BLOCK
        // -----------------------------------------

        regions.forEach(region => {

            companies.forEach(
                (company, companyIndex) => {

                    const column =
                        region.startColumn +
                        companyIndex;

                    const rawValue =
                        row[column];


                    if (
                        rawValue === undefined
                    ) {
                        return;
                    }


                    let parsedValue;


                    // ---------------------------------
                    // BOOLEAN FIELD
                    // ---------------------------------

                    if (
                        metricName ===
                        "freeShipping"
                    ) {

                        const value =
                            String(rawValue)
                                .trim()
                                .toLowerCase();

                        parsedValue =
                            value === "1" ||
                            value === "yes" ||
                            value === "true";

                    }

                    else {

                        parsedValue =
                            parseNumericValue(
                                rawValue
                            );

                    }


                    // ---------------------------------
                    // MARKET SHARE IS STORED AS DECIMAL
                    // ---------------------------------

                    if (
                        metricName ===
                            "marketShare" &&
                        parsedValue !== null
                    ) {

                        parsedValue =
                            parsedValue * 100;

                    }


                    output
                        .regions[
                            region.name
                        ][
                            currentSegment
                        ][
                            company
                        ][
                            metricName
                        ] =
                            parsedValue;

                }
            );

        });

    });


    return output;
}
// ==========================================
// FILE TYPE DETECTION
// ==========================================

function detectReportType(filename) {

    const upper =
        filename.toUpperCase();

    if (upper.includes("_FIR_")) {
        return "FIR";
    }

    if (upper.includes("_CIR_")) {
        return "CIR";
    }

    if (upper.includes("_COR_")) {
        return "COR";
    }

    return "UNKNOWN";
}


// ==========================================
// YEAR DETECTION
// ==========================================

function detectYear(filename, rows) {

    const filenameMatch =
        filename.match(
            /YEAR[_\s-]*(\d+)/i
        );

    if (filenameMatch) {

        return parseInt(
            filenameMatch[1]
        );

    }


    for (const row of rows) {

        const joined =
            row.join(" ");

        const match =
            joined.match(
                /\bYear\b.*?\b(\d{1,3})\b/i
            );

        if (match) {

            return parseInt(
                match[1]
            );

        }

    }


    return null;
}


// ==========================================
// INDUSTRY DETECTION
// ==========================================

function detectIndustry(
    filename,
    rows
) {

    const filenameMatch =
        filename.match(
            /Industry[_\s-]*(\d+)/i
        );

    if (filenameMatch) {

        return parseInt(
            filenameMatch[1]
        );

    }


    for (const row of rows) {

        for (
            let i = 0;
            i < row.length;
            i++
        ) {

            if (
                row[i]
                    .toLowerCase()
                    .includes(
                        "industry number"
                    )
            ) {

                for (
                    let j = i + 1;
                    j < row.length;
                    j++
                ) {

                    const num =
                        parseInt(row[j]);

                    if (!isNaN(num)) {
                        return num;
                    }

                }

            }

        }

    }


    return null;
}


// ==========================================
// COR COMPANY DETECTION
// ==========================================

function detectCompany(rows) {

    let companyLetter = null;
    let companyName = null;
    let companyNumber = null;


    for (const row of rows) {

        const normalized =
            row.map(value =>
                value.trim()
            );


        for (
            let i = 0;
            i < normalized.length;
            i++
        ) {

            const label =
                normalized[i]
                    .toLowerCase();


            if (
                label.includes(
                    "company number"
                )
            ) {

                companyNumber =
                    findNextValue(
                        normalized,
                        i + 1
                    );

            }


            if (
                label.includes(
                    "compan letter"
                ) ||
                label.includes(
                    "company letter"
                )
            ) {

                companyLetter =
                    findNextValue(
                        normalized,
                        i + 1
                    );

            }


            if (
                label.includes(
                    "company name"
                )
            ) {

                companyName =
                    findNextValue(
                        normalized,
                        i + 1
                    );

            }

        }

    }


    return {
        companyNumber,
        companyLetter,
        companyName
    };
}


function findNextValue(
    row,
    startIndex
) {

    for (
        let i = startIndex;
        i < row.length;
        i++
    ) {

        const value =
            row[i].trim();

        if (
            value !== "" &&
            value !== "YR" &&
            value !== "IN"
        ) {

            return value;

        }

    }

    return null;
}


// ==========================================
// CIR REGION DETECTION
// ==========================================

function detectCIRRegions(rows) {

    const knownRegions = [
        "North America",
        "Europe-Africa",
        "Asia-Pacific",
        "Asia-Pacifc",
        "Latin America"
    ];

    const regions = [];

    for (const row of rows) {

        row.forEach(cell => {

            knownRegions.forEach(region => {

                if (
                    cell.includes(region) &&
                    !regions.includes(region)
                ) {

                    regions.push(region);

                }

            });

        });


        if (regions.length > 0) {
            break;
        }

    }


    return regions.map(region =>
        region === "Asia-Pacifc"
            ? "Asia-Pacific"
            : region
    );
}


// ==========================================
// NORMALIZE IMPORTED FILE
// ==========================================

function normalizeBSGFile(
    file,
    text
) {

    const rows =
        parseCSV(text);

    const reportType =
        detectReportType(
            file.name
        );

    const year =
        detectYear(
            file.name,
            rows
        );

    const industry =
        detectIndustry(
            file.name,
            rows
        );


    const normalized = {

        id:
            `${industry}-${reportType}-${year}`,

        filename:
            file.name,

        reportType,

        industry,

        year,

        importedAt:
            new Date().toISOString(),

        rowCount:
            rows.length,

        rawRows:
            rows

    };


    if (reportType === "FIR") {

    normalized.normalizedData =
        normalizeFIR(rows);

    }


    if (reportType === "CIR") {

    normalized.regions =
        detectCIRRegions(rows);

    normalized.normalizedData =
        normalizeCIR(rows);

    }


    if (reportType === "COR") {

    normalized.company =
        detectCompany(rows);

    normalized.normalizedData =
        normalizeCOR(rows);

    // Use trusted metadata already detected
    // during file import.
    normalized.normalizedData.metadata.industry =
        industry;

    normalized.normalizedData.metadata.year =
        year;

    normalized.normalizedData.metadata.companyNumber =
    parseBSGValue(
        normalized.company?.companyNumber
    );

    normalized.normalizedData.metadata.companyLetter =
        normalized.company?.companyLetter ?? null;

    normalized.normalizedData.metadata.companyName =
        normalized.company?.companyName ?? null;

}

    return normalized;
}

// #endregion



//#region import data event listeners


function showImportStatus(
    message,
    isError = false
) {

    const status =
        document.getElementById(
            "importStatus"
        );

    if (!status) {

        console.warn(
            "importStatus element not found:",
            message
        );

        return;
    }

    status.textContent =
        message;

    status.classList.toggle(
        "error",
        isError
    );
}

function showExtractStatus(
    message,
    type = "normal"
) {

    const status =
        document.getElementById(
            "extractStatus"
        );

    if (!status) {
        console.warn(
            "extractStatus element not found:",
            message
        );

        return;
    }

    status.textContent =
        message;

    status.classList.remove(
        "success",
        "error"
    );

    if (
        type === "success" ||
        type === "error"
    ) {
        status.classList.add(
            type
        );
    }

}

document
    .getElementById("addCSV")
    .addEventListener(
        "click",
        () => {

            console.log(
                "addCSV clicked"
            );

            const input =
                document.getElementById(
                    "csvFiles"
                );

            if (!input) {

                showImportStatus(
                    "CSV file input not found.",
                    true
                );

                return;
            }

            input.click();

        }
    );

document
    .getElementById("csvFiles")
    .addEventListener(
        "change",
        event => {

            const input =
                event.target;

            const files =
                Array.from(
                    input.files
                );

            if (files.length === 0) {
                return;
            }

            addFilesToQueue(
                files
            );

            // Refresh visible queue.
            displayFileQueue();

            showImportStatus(
                `${files.length} file(s) added to queue.`,
                false
            );

            // Allows the same files to
            // be selected again later.
            input.value = "";

        }
    );


document
    .getElementById("extract")
    .addEventListener(
        "click",
        async () => {

            const output =
                document.getElementById(
                    "output"
                );

            showExtractStatus(
                "Extracting current BSG page..."
            );

            try {

                const [tab] =
                    await chrome.tabs.query({
                        active: true,
                        currentWindow: true
                    });

                if (!tab?.id) {
                    throw new Error(
                        "No active browser tab found."
                    );
                }

                let response;

                try {

                    // First try the existing
                    // content script.
                    response =
                        await chrome.tabs.sendMessage(
                            tab.id,
                            {
                                action:
                                    "extractBSGData"
                            }
                        );

                }
                catch (error) {

                    const message =
                        error?.message || "";

                    const noReceiver =
                        message.includes(
                            "Receiving end does not exist"
                        ) ||
                        message.includes(
                            "Could not establish connection"
                        );

                    if (!noReceiver) {
                        throw error;
                    }

                    console.log(
                        "Content script unavailable. Injecting content.js..."
                    );

                    // Fallback for Opera GX or
                    // pages where the content
                    // script was not injected.
                    await chrome.scripting.executeScript({
                        target: {
                            tabId:
                                tab.id
                        },
                        files: [
                            "content.js"
                        ]
                    });

                    response =
                        await chrome.tabs.sendMessage(
                            tab.id,
                            {
                                action:
                                    "extractBSGData"
                            }
                        );

                }

                console.log(
                    "Extraction response:",
                    response
                );

                if (!response) {
                    throw new Error(
                        "No response received from the BSG page."
                    );
                }

                if (!response.success) {
                    throw new Error(
                        response.error ||
                        "Page extraction failed."
                    );
                }
                
                if (
                    response.data?.currentRound
                ) {

                    const currentRound =
                        response.data.currentRound;

                    if (
                        currentRound.page ===
                        "corporate_lobby"
                    ) {

                        const industry =
                            currentRound.simulation
                                ?.industry;

                        await saveLobbySnapshot(
                            industry,
                            currentRound
                        );

                    } else {

                        await saveCurrentPageSnapshot(
                            response.data
                        );

                    }

                }

                if (output) {

                    output.textContent =
                        JSON.stringify(
                            response.data,
                            null,
                            2
                        );

                }

                showExtractStatus(
                    "Current BSG page extracted successfully.",
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "Could not extract BSG page:",
                    error
                );

                if (output) {

                    output.textContent =
                        `Error: ${
                            error?.message ||
                            String(error)
                        }`;

                }

                showExtractStatus(
                    `Extraction failed: ${
                        error?.message ||
                        String(error)
                    }`,
                    "error"
                );

            }

        }
    );

document
    .getElementById(
        "saveFinalSnapshot"
    )
    .addEventListener(
        "click",
        async () => {

            try {

                const industry =
                    await getActiveIndustry();

                const snapshot =
                    await saveFinalDecisionSnapshot(
                        industry
                    );

                console.log(
                    "Final decision snapshot saved:",
                    snapshot
                );

                showExtractStatus(
                    `Year ${snapshot.year} final snapshot saved.`,
                    "success"
                );

            }
            catch (error) {

                console.error(
                    "Could not save final snapshot:",
                    error
                );

                showExtractStatus(
                    `Snapshot failed: ${
                        error?.message ||
                        String(error)
                    }`,
                    "error"
                );

            }

        }
    );


document
    .getElementById("importCSV")
    .addEventListener(
        "click",
        async () => {

            if (csvImportQueue.length === 0) {

                showImportStatus(
                    "There are no CSV files in the import queue.",
                    true
                );

                return;
            }

            const importedFiles = [];
            const failedFiles = [];


            for (const file of csvImportQueue) {

                try {

                    const text =
                        await file.text();

                    const normalized =
                        normalizeBSGFile(
                            file,
                            text
                        );


                    if (
                        normalized.reportType ===
                        "UNKNOWN"
                    ) {

                        failedFiles.push({
                            filename: file.name,
                            reason:
                                "Could not determine report type."
                        });

                        continue;
                    }


                    if (
                        normalized.year === null
                    ) {

                        failedFiles.push({
                            filename: file.name,
                            reason:
                                "Could not determine year."
                        });

                        continue;
                    }


                    if (
                        normalized.industry === null
                    ) {

                        failedFiles.push({
                            filename: file.name,
                            reason:
                                "Could not determine industry."
                        });

                        continue;
                    }


                    importedFiles.push(
                        normalized
                    );

                }

                catch (error) {

                    console.error(
                        "Could not import:",
                        file.name,
                        error
                    );

                    failedFiles.push({
                        filename: file.name,
                        reason: error.message
                    });

                }

            }


            if (importedFiles.length > 0) {

                await saveImportedFiles(
                    importedFiles
                );

            }


            let message =
                `Imported ${importedFiles.length} file(s).`;


            if (failedFiles.length > 0) {

                message +=
                    ` ${failedFiles.length} file(s) failed.`;

                console.warn(
                    "Failed BSG imports:",
                    failedFiles
                );

            }


            showImportStatus(
                message,
                failedFiles.length > 0
            );


            // Clear successfully processed queue.
            csvImportQueue = [];

            displayFileQueue();

            await displayLoadedData();

            await displayDataSummary();

        }
    );

document
    .getElementById("clearQueue")
    .addEventListener(
        "click",
        () => {

            csvImportQueue = [];

            document.getElementById(
                "csvFiles"
            ).value = "";

            displayFileQueue();

            showImportStatus(
                "File queue cleared.",
                false
            );

        }
    );

// ==========================================
// CLEAR STORAGE
// ==========================================

document
    .getElementById("clearHistoricalData")
    .addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "Are you sure you want to clear all imported BSG historical data?\n\n" +
                    "This action cannot be undone."
                );

            if (!confirmed) {
                return;
            }

            await chrome.storage.local.remove(
                "bsgHistoricalData"
            );

            showImportStatus(
                "Imported BSG data cleared.",
                false
            );

            await displayLoadedData();

            await displayDataSummary();

        }
    );





// ==========================================
// SAVE TO CHROME STORAGE
// ==========================================

async function saveImportedFiles(
    newFiles
) {

    const result =
        await chrome.storage.local.get(
            ["bsgHistoricalData"]
        );


    const database =
        result.bsgHistoricalData || {};


    newFiles.forEach(file => {

        const yearKey =
            `year_${file.year}`;

        const industryKey =
            `industry_${file.industry}`;


        if (!database[industryKey]) {

            database[industryKey] = {

                industry:
                    file.industry,

                simulation: {},

                years: {}

            };

        }


        // Ensure both new and older databases
        // have complete simulation metadata.

        ensureSimulationMetadata(
            database[industryKey],
            file.industry
        );


        if (
            !database[industryKey]
                .years[yearKey]
        ) {

            database[industryKey]
                .years[yearKey] = {};

        }


        database[industryKey]
            .years[yearKey][
                file.reportType
            ] = file;

    });


    await chrome.storage.local.set({

        bsgHistoricalData:
            database

    });

}


function ensureSimulationMetadata(
    industryData,
    industry
) {

    if (!industryData.simulation) {
        industryData.simulation = {};
    }

    const simulation =
        industryData.simulation;


    if (
        simulation.industry ===
        undefined
    ) {
        simulation.industry =
            industry;
    }


    if (
        simulation.userCompany ===
        undefined
    ) {
        simulation.userCompany =
            "H";
    }


    if (
        simulation.phase ===
        undefined
    ) {
        simulation.phase =
            "practice";
    }


    if (
        simulation.firstYear ===
        undefined
    ) {
        simulation.firstYear =
            10;
    }


    if (
        simulation.finalYear ===
        undefined
    ) {
        simulation.finalYear =
            20;
    }


    if (
        simulation.currentYear ===
        undefined
    ) {
        simulation.currentYear =
            12;
    }


    return industryData;

}

async function fixSimulationPhase(
    industry,
    phase = "practice"
) {

    const result =
        await chrome.storage.local.get(
            ["bsgHistoricalData"]
        );

    const database =
        result.bsgHistoricalData || {};

    const industryKey =
        `industry_${industry}`;

    const industryData =
        database[industryKey];

    if (!industryData) {
        throw new Error(
            `Industry ${industry} not found.`
        );
    }


    ensureSimulationMetadata(
        industryData,
        industry
    );


    industryData.simulation.phase =
        phase;


    await chrome.storage.local.set({
        bsgHistoricalData:
            database
    });


    return {
        industry,
        simulation:
            industryData.simulation
    };

}

// ==========================================
// DISPLAY LOADED DATA
// ==========================================

async function displayLoadedData() {

    const result =
        await chrome.storage.local.get(
            ["bsgHistoricalData"]
        );


    const database =
        result.bsgHistoricalData;


    const container =
        document.getElementById(
            "loadedData"
        );

    if (!container) {

        console.warn(
            "loadedData container not found."
        );

        return;
}


    if (
        !database ||
        Object.keys(database).length === 0
    ) {

        container.textContent =
            "No historical data loaded.";

        return;
    }


    let html = "";


    Object.values(database)
        .forEach(industry => {

            html +=
                `<strong>Industry ${industry.industry}</strong><br>`;


            const yearEntries =
                Object.entries(
                    industry.years
                );


            yearEntries.sort(
                (a, b) => {

                    const yearA =
                        parseInt(
                            a[0].replace(
                                "year_",
                                ""
                            )
                        );

                    const yearB =
                        parseInt(
                            b[0].replace(
                                "year_",
                                ""
                            )
                        );

                    return yearA - yearB;

                }
            );


            yearEntries.forEach(
                ([yearKey, yearData]) => {

                    const year =
                        yearKey.replace(
                            "year_",
                            ""
                        );


                    html +=
                        `<div class="loaded-item">`;

                    html +=
                        `<strong>Year ${year}</strong><br>`;


                    const types = [
                        "FIR",
                        "CIR",
                        "COR"
                    ];


                    types.forEach(type => {

                        if (yearData[type]) {

                            html +=
                                `[OK] ${type} `;

                        }

                        else {

                            html +=
                                `[--] ${type} `;

                        }

                    });


                    html += "<br>";


                    // Show filenames
                    types.forEach(type => {

                        if (yearData[type]) {

                            html +=
                                `<div style="margin-left:12px;font-size:11px;">`;

                            html +=
                                `${type}: ${yearData[type].filename}`;

                            html +=
                                `</div>`;

                        }

                    });


                    // Show company metadata from COR
                    if (
                        yearData.COR &&
                        yearData.COR.company
                    ) {

                        const company =
                            yearData.COR.company;


                        html +=
                            `<div style="margin-left:12px;">`;

                        html +=
                            `Company: ${company.companyLetter || "Unknown"}`;


                        if (company.companyName) {

                            html +=
                                ` - ${company.companyName}`;

                        }


                        html += "</div>";

                    }


                    html += "</div>";

                }
            );


            html += "<br>";

        });


    container.innerHTML = html;
}

async function displayDataSummary() {

    const summaryContainer =
        document.getElementById(
            "simulationSummary"
        );

    const reportContainer =
        document.getElementById(
            "reportAvailability"
        );

    if (
        !summaryContainer ||
        !reportContainer
    ) {
        console.warn(
            "Data summary containers not found."
        );

        return;
    }

    try {

        const availableData =
            await getAvailableData();

        console.log(
            "Available BSG data:",
            availableData
        );

        const industries =
            Object.values(
                availableData.industries || {}
            );

        if (industries.length === 0) {

            summaryContainer.innerHTML =
                "No BSG data loaded.";

            reportContainer.innerHTML =
                "No reports available.";

            return;
        }

        // For now we only expect one industry.
        const industry =
            industries[0];

        const simulation =
            industry.simulation || {};

        const years =
            industry.years || {};

        const historicalYears =
            Object.keys(years)
                .map(Number)
                .sort(
                    (a, b) =>
                        a - b
                );

        summaryContainer.innerHTML = `
            <div class="summary-grid">

                <div class="summary-label">
                    Industry
                </div>

                <div class="summary-value">
                    ${industry.industry ?? "—"}
                </div>

                <div class="summary-label">
                    Company
                </div>

                <div class="summary-value">
                    ${simulation.userCompany ?? "—"}
                </div>

                <div class="summary-label">
                    Phase
                </div>

                <div class="summary-value">
                    ${formatPhase(
                        simulation.phase
                    )}
                </div>

                <div class="summary-label">
                    Current Year
                </div>

                <div class="summary-value">
                    ${simulation.currentYear ?? "—"}
                </div>

                <div class="summary-label">
                    Historical Years
                </div>

                <div class="summary-value">
                    ${
                        historicalYears.length
                            ? historicalYears.join(", ")
                            : "None"
                    }
                </div>

            </div>
        `;

        renderReportAvailability(
            years,
            reportContainer
        );

    }
    catch (error) {

        console.error(
            "Failed to display data summary:",
            error
        );

        summaryContainer.textContent =
            "Unable to load simulation summary.";

        reportContainer.textContent =
            "Unable to load report availability.";
    }
}


function formatPhase(
    phase
) {

    if (!phase) {
        return "—";
    }

    return (
        phase.charAt(0).toUpperCase() +
        phase.slice(1)
    );
}


function renderReportAvailability(
    years,
    container
) {

    const yearNumbers =
        Object.keys(years)
            .map(Number)
            .sort(
                (a, b) =>
                    a - b
            );

    if (yearNumbers.length === 0) {

        container.innerHTML =
            "No historical reports loaded.";

        return;
    }

    let html =
        `<div class="report-table">`;

    html += `
        <div class="report-row report-header">
            <div>Year</div>
            <div>FIR</div>
            <div>CIR</div>
            <div>COR</div>
        </div>
    `;

    yearNumbers.forEach(
        year => {

            const yearData =
                years[year] || {};

            html += `
                <div class="report-row">

                    <div>
                        ${year}
                    </div>

                    <div>
                        ${reportStatus(
                            yearData.FIR
                        )}
                    </div>

                    <div>
                        ${reportStatus(
                            yearData.CIR
                        )}
                    </div>

                    <div>
                        ${reportStatus(
                            yearData.COR
                        )}
                    </div>

                </div>
            `;
        }
    );

    html += `</div>`;

    container.innerHTML =
        html;
}

function reportStatus(
    report
) {

    return report
        ? "✓"
        : "—";
}


// #endregion


// #region Development test only.
// No longer needed in production UI.
// ==========================================
// LOAD DISPLAY WHEN POPUP OPENS
// ==========================================



// document
//     .getElementById(
//         "testHistory"
//     )
//     .addEventListener(
//         "click",
//         async () => {

//             const result =
//                 await chrome.storage.local.get(
//                     ["bsgHistoricalData"]
//                 );


//             const database =
//                 result.bsgHistoricalData;


//             const industry =
//                 database["industry_42"];


//             if (!industry) {

//                 document.getElementById(
//                     "historyOutput"
//                 ).textContent =
//                     "Industry 42 not found.";

//                 return;
//             }


//             const year10 =
//                 industry
//                     .years
//                     .year_10
//                     ?.CIR
//                     ?.normalizedData;


//             const year11 =
//                 industry
//                     .years
//                     .year_11
//                     ?.CIR
//                     ?.normalizedData;


//             const output = {
//                 year10:
//                     year10
//                         ?.regions
//                         ?.["North America"]
//                         ?.internet
//                         ?.C,

//                 year11:
//                     year11
//                         ?.regions
//                         ?.["North America"]
//                         ?.internet
//                         ?.C
//             };


//             document.getElementById(
//                 "historyOutput"
//             ).textContent =
//                 JSON.stringify(
//                     output,
//                     null,
//                     2
//                 );

//         }
//     );
//     document
//     .getElementById(
//         "testReports"
//     )
//     .addEventListener(
//         "click",
//         async () => {

//             const result =
//                 await chrome.storage.local.get(
//                     ["bsgHistoricalData"]
//                 );


//             const database =
//                 result.bsgHistoricalData;


//             const year11 =
//                 database
//                     ?.industry_42
//                     ?.years
//                     ?.year_11;


//             if (!year11) {

//                 document.getElementById(
//                     "reportOutput"
//                 ).textContent =
//                     "Year 11 data not found.";

//                 return;
//             }


//             const fir =
//                 year11
//                     ?.FIR
//                     ?.normalizedData;


//             const cor =
//                 year11
//                     ?.COR
//                     ?.normalizedData;


//             const output = {

//                 fir: {

//                     metadata:
//                         fir?.metadata,

//                     companies:
//                         fir?.companies,

//                     availablePages:
//                         fir
//                             ? Object.keys(
//                                 fir.pages
//                             )
//                             : []

//                 },


//                 cor: {

//                     metadata:
//                         cor?.metadata,

//                     availableSections:
//                         cor
//                             ? Object.keys(
//                                 cor.sections
//                             )
//                             : [],

//                     incomeStatementRows:
//                         cor
//                             ?.sections
//                             ?.income_statement
//                             ?.rows
//                             ?.slice(
//                                 0,
//                                 10
//                             )

//                 }

//             };


//             document.getElementById(
//                 "reportOutput"
//             ).textContent =
//                 JSON.stringify(
//                     output,
//                     null,
//                     2
//                 );

//         }
//     );

// ==========================================
// DATA ACCESS TEST PANEL
// ==========================================

// document
//     .getElementById(
//         "runDataAccessTest"
//     )
//     .addEventListener(
//         "click",
//         async () => {

//             const output =
//                 document.getElementById(
//                     "dataAccessOutput"
//                 );

//             const year =
//                 Number(
//                     document.getElementById(
//                         "testYear"
//                     ).value
//                 );

//             const dataType =
//                 document.getElementById(
//                     "testDataType"
//                 ).value;


//             output.textContent =
//                 "Running test...";


//             try {

//                 let result;


//                 // ==================================
//                 // AVAILABLE DATA
//                 // ==================================

//                 if (
//                     dataType === "available"
//                 ) {

//                     result =
//                         await getAvailableData();

//                 }


//                 // ==================================
//                 // FIR TEST
//                 // ==================================

//                 else if (
//                     dataType === "fir"
//                 ) {

//                     result =
//                         await getFIR(
//                             42,
//                             year,
//                             "financial_statistics"
//                         );

//                 }


//                 // ==================================
//                 // CIR TEST
//                 // ==================================

//                 else if (
//                     dataType === "cir"
//                 ) {

//                     result =
//                         await getCIR(
//                             42,
//                             year,
//                             "North America",
//                             "internet",
//                             "C"
//                         );

//                 }


//                 // ==================================
//                 // COR TEST
//                 // ==================================

//                 else if (
//                     dataType === "cor"
//                 ) {

//                     result =
//                         await getCOR(
//                             42,
//                             year,
//                             "income_statement",
//                             null
//                         );

//                 }


//                 // ==================================
//                 // COMPANY HISTORY TEST
//                 // ==================================

//                 else if (
//                     dataType === "history"
//                 ) {

//                     result =
//                         await getCompanyHistory(
//                             42,
//                             "C"
//                         );

//                 }


//                 const json =
//                     JSON.stringify(
//                         result,
//                         null,
//                         2
//                     );

//                 const sizeKB =
//                     (
//                         new Blob([json]).size /
//                         1024
//                     ).toFixed(2);

//                 output.textContent =
//                     `Result Size: ${sizeKB} KB\n\n` +
//                     json;

//             }

//             catch (error) {

//                 console.error(
//                     "Data access test failed:",
//                     error
//                 );

//                 output.textContent =
//                     "ERROR:\n\n" +
//                     error.message;

//             }

//         }
//     );

//     // ==========================================
// // AGENT TOOL TEST
// // ==========================================

// document
//     .getElementById(
//         "runAgentToolTest"
//     )
//     .addEventListener(
//         "click",
//         async () => {

//             const output =
//                 document.getElementById(
//                     "agentToolOutput"
//                 );

//             const test =
//                 document.getElementById(
//                     "agentToolTest"
//                 ).value;


//             output.textContent =
//                 "Running agent tool...";


//             try {

//                 let toolName;
//                 let args;


//                 // ==========================
//                 // AVAILABLE DATA
//                 // ==========================

//                 if (
//                     test === "available"
//                 ) {

//                     toolName =
//                         "get_available_data";

//                     args = {};

//                 }


//                 // ==========================
//                 // FIR
//                 // ==========================

//                 else if (
//                     test === "fir"
//                 ) {

//                     toolName =
//                         "get_fir";

//                     args = {

//                         industry: 42,

//                         year: 11,

//                         page:
//                             "financial_statistics"

//                     };

//                 }


//                 // ==========================
//                 // CIR
//                 // ==========================

//                 else if (
//                     test === "cir"
//                 ) {

//                     toolName =
//                         "get_cir";

//                     args = {

//                         industry: 42,

//                         year: 11,

//                         region:
//                             "North America",

//                         segment:
//                             "internet",

//                         company:
//                             "C"

//                     };

//                 }


//                 // ==========================
//                 // COR
//                 // ==========================

//                 else if (
//                     test === "cor"
//                 ) {

//                     toolName =
//                         "get_cor";

//                     args = {

//                         industry: 42,

//                         year: 11,

//                         section:
//                             "cash_flow",

//                         region:
//                             null

//                     };

//                 }


//                 // ==========================
//                 // HISTORY
//                 // ==========================

//                 else if (
//                     test === "history"
//                 ) {

//                     toolName =
//                         "get_company_history";

//                     args = {

//                         industry: 42,

//                         company: "C"

//                     };

//                 }


//                 const result =
//                     await executeBSGTool(
//                         toolName,
//                         args
//                     );


//                 const json =
//                     JSON.stringify(
//                         result,
//                         null,
//                         2
//                     );


//                 const sizeKB =
//                     (
//                         new Blob(
//                             [json]
//                         ).size /
//                         1024
//                     )
//                     .toFixed(2);


//                 output.textContent =
//                     `Tool: ${toolName}\n` +
//                     `Result Size: ${sizeKB} KB\n\n` +
//                     json;

//             }

//             catch (error) {

//                 console.error(
//                     "Agent tool test failed:",
//                     error
//                 );


//                 output.textContent =
//                     "ERROR:\n\n" +
//                     error.message;

//             }

//         }
//     );
// #endregion










//region Agent Chat

async function loadChatHistory() {

    const result =
        await chrome.storage.local.get(
            ["bsgAgentChatHistory"]
        );

    return (
        result.bsgAgentChatHistory ||
        []
    );
}


async function saveChatHistory(
    history
) {

    await chrome.storage.local.set({
        bsgAgentChatHistory:
            history
    });

}


function renderChatHistory(
    history
) {

    const container =
        document.getElementById(
            "chatMessages"
        );

    if (!container) {
        return;
    }


    container.innerHTML = "";


    // Show welcome message if there
    // are no saved messages yet.

    if (history.length === 0) {

        container.innerHTML = `
            <div class="welcome-message">

                <h2>
                    Ask BSG Copilot
                </h2>

                <p>
                    Analyze competitors,
                    financial performance,
                    industry conditions,
                    and strategic decisions.
                </p>

            </div>
        `;

        return;
    }


    history.forEach(message => {

        const messageElement =
            document.createElement(
                "div"
            );


        messageElement.classList.add(
            "chat-message"
        );


        messageElement.classList.add(
            message.role === "user"
                ? "user-message"
                : "assistant-message"
        );


        const roleLabel =
            document.createElement(
                "div"
            );

        roleLabel.className =
            "message-role";

        roleLabel.textContent =
            message.role === "user"
                ? "You"
                : "BSG Copilot";


        const content =
            document.createElement(
                "div"
            );

        content.className =
            "message-content";

        content.textContent =
            message.content;


        messageElement.appendChild(
            roleLabel
        );

        messageElement.appendChild(
            content
        );


        container.appendChild(
            messageElement
        );

    });


    container.scrollTop =
        container.scrollHeight;
}


async function restoreChatHistory() {

    const history =
        await loadChatHistory();

    renderChatHistory(
        history
    );


    const input =
        document.getElementById(
            "agentQuestion"
        );

    if (input) {
        input.value = "";
    }
}

async function submitAgentQuestion() {

    const input =
        document.getElementById(
            "agentQuestion"
        );

    const sendButton =
        document.getElementById(
            "askAgent"
        );

    const question =
        input.value.trim();

    if (!question) {
        return;
    }

    // Prevent duplicate submissions.
    sendButton.disabled = true;

    // Clear input immediately.
    input.value = "";

    const history =
        await loadChatHistory();

    history.push({
        role: "user",
        content: question
    });

    await saveChatHistory(
        history
    );

    renderChatHistory(
        history
    );

    const status =
        document.getElementById(
            "agentStatus"
        );

    if (status) {
        status.textContent =
            "Analyzing BSG data...";
        status.hidden = false;
    }

    try {

        const answer =
            await askBSGAgent(
                question
            );

        history.push({
            role: "assistant",
            content: answer
        });

        await saveChatHistory(
            history
        );

        renderChatHistory(
            history
        );

    }
    catch (error) {

        console.error(
            "Agent request failed:",
            error
        );

        history.push({
            role: "assistant",
            content:
                `Error: ${error.message}`
        });

        await saveChatHistory(
            history
        );

        renderChatHistory(
            history
        );

    }
    finally {

        sendButton.disabled = false;

        if (status) {
            status.hidden = true;
        }

        input.focus();

    }
}

document
    .getElementById("askAgent")
    .addEventListener(
        "click",
        submitAgentQuestion
    );

document
    .getElementById("agentQuestion")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                submitAgentQuestion();

            }

        }
    );

// ==============================
// Clear question button
// ==============================

const clearChatButton =
    document.getElementById(
        "clearChat"
    );

if (clearChatButton) {

    clearChatButton
        .addEventListener(
            "click",
            async () => {

                const confirmed =
                    confirm(
                        "Are you sure you want to clear the chat history?"
                    );

                if (!confirmed) {
                    return;
                }

                // Remove saved chat history.
                await chrome.storage.local.remove(
                    "bsgAgentChatHistory"
                );

                // Clear anything currently
                // typed in the input.
                const input =
                    document.getElementById(
                        "agentQuestion"
                    );

                if (input) {
                    input.value = "";
                    input.focus();
                }

                // Reset the visible chat.
                renderChatHistory([]);

            }
        );

}
// #endregion

// =============================
// APP NAVIGATION
// =============================

// #region Navigation

const navButtons =
    document.querySelectorAll(
        ".nav-button"
    );

const chatView =
    document.getElementById(
        "chatView"
    );

const dataView =
    document.getElementById(
        "dataView"
    );

const currentRoundView =
    document.getElementById(
        "currentRoundView"
    );


function showView(
    viewName
) {

    console.log(
        "Switching view:",
        viewName
    );


    // Hide all views first.

    chatView.hidden = true;
    dataView.hidden = true;
    currentRoundView.hidden = true;


    // Remove active state from tabs.

    navButtons.forEach(
        button => {

            button.classList.remove(
                "active"
            );

        }
    );


    // Show requested view.

    if (viewName === "chat") {

        chatView.hidden = false;

    }

    else if (
        viewName === "data"
    ) {

        dataView.hidden = false;

    }

    else if (
        viewName === "currentRound"
    ) {

        currentRoundView.hidden =
            false;

    }


    // Highlight matching tab.

    const activeButton =
        document.querySelector(
            `.nav-button[data-view="${viewName}"]`
        );

    if (activeButton) {

        activeButton.classList.add(
            "active"
        );

    }

}


navButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                showView(
                    button.dataset.view
                );

            }
        );

    }
);

// #endregion


// #region Startup

restoreChatHistory();

displayLoadedData()
    .catch(error => {

        console.error(
            "Failed to display loaded data:",
            error
        );

    });

displayDataSummary()
    .catch(
        error => {
            console.error(
                "Failed to display data summary:",
                error
            );
        }
    );

// #endregion

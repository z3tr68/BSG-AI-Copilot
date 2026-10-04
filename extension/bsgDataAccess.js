// ==========================================
// BSG DATA ACCESS LAYER
// ==========================================
//
// Reads normalized historical BSG data from
// chrome.storage.local.
//
// Storage structure:
//
// bsgHistoricalData
//   └── industry_42
//       ├── simulation
//       ├── startingData
//       │   └── Year 10 canonical shared baseline
//       └── years
//           ├── year_11
//           ├── year_12
//           └── ... completed LIVE years only
//
// bsgCurrentRoundData
//   └── industry_42
//       └── current live decision-page snapshots
//
// bsgPracticeArchive
//   └── industry_42
//       └── archived practice data
//
// Normal historical access functions never fall
// back to bsgPracticeArchive.
//
// ==========================================


// ==========================================
// LOAD DATABASE
// ==========================================

async function loadBSGDatabase() {

    const result =
        await chrome.storage.local.get(
            ["bsgHistoricalData"]
        );


    if (
        !result ||
        !result.bsgHistoricalData
    ) {

        throw new Error(
            "No historical BSG data found."
        );

    }


    return result.bsgHistoricalData;
}


//#region DATA RETRIEVAL TOOLS
//some double as agent tools

// ==========================================
// GET INDUSTRY
// ==========================================

async function getIndustryData(
    industry
) {

    const database =
        await loadBSGDatabase();


    const industryKey =
        `industry_${industry}`;


    const industryData =
        database[industryKey];


    if (!industryData) {

        throw new Error(
            `Industry ${industry} not found.`
        );

    }


    return industryData;
}


// ==========================================
// GET RATES
// ==========================================

async function getRates(
    industry,
    options = {}
) {
    const {
        rateType = "all"
    } = options;

    const validRateTypes = [
        "all",
        "interest",
        "exchange"
    ];

    if (
        !validRateTypes.includes(rateType)
    ) {
        throw new Error(
            `Invalid rateType: ${rateType}`
        );
    }

    const industryKey =
        `industry_${industry}`;

    const stored =
        await chrome.storage.local.get(
            "bsgCurrentRoundData"
        );

    const currentRound =
        stored.bsgCurrentRoundData
            ?.[industryKey];

    if (!currentRound) {
        return {
            error:
                `No current-round data found for Industry ${industry}.`
        };
    }

    const lobby =
        currentRound.lobby;

    if (!lobby) {
        return {
            error:
                "No Corporate Lobby snapshot is available. Extract the Corporate Lobby page first."
        };
    }

    if (rateType === "interest") {
        return {
            currentYear:
                currentRound.currentYear,

            interestRates:
                lobby.interestRates ?? null
        };
    }

    if (rateType === "exchange") {
        return {
            currentYear:
                currentRound.currentYear,

            exchangeRates:
                lobby.exchangeRates ?? null
        };
    }

    return {
        currentYear:
            currentRound.currentYear,

        interestRates:
            lobby.interestRates ?? null,

        exchangeRates:
            lobby.exchangeRates ?? null
    };
}


// ==========================================
// GET YEAR
// ==========================================

async function getYearData(industry, year) {
    const industryData = await getIndustryData(industry);
    const numericYear = Number(year);

    // Year 10 is the canonical shared starting baseline.
    // It is intentionally stored once instead of under live years.
    if (numericYear === 10) {
        if (!industryData.startingData) {
            throw new Error(
                `Canonical Year 10 starting data not found for Industry ${industry}.`
            );
        }

        return industryData.startingData;
    }

    // Years 11+ are LIVE historical results only.
    // Practice data is never consulted here.
    const yearKey = `year_${numericYear}`;
    const yearData = industryData.years?.[yearKey];

    if (!yearData) {
        throw new Error(
            `Live Year ${numericYear} data not found for Industry ${industry}.`
        );
    }

    return yearData;
}


// ==========================================
// GET YEAR
// ==========================================

async function getAvailableData() {

    const database =
        await loadBSGDatabase();

    const currentResult =
        await chrome.storage.local.get([
            "bsgCurrentRoundData",
            "bsgPracticeArchive"
        ]);

    const currentDatabase =
        currentResult.bsgCurrentRoundData || {};

    const practiceDatabase =
        currentResult.bsgPracticeArchive || {};


    const output = {
        industries: {}
    };


    for (
        const [
            industryKey,
            industryData
        ] of Object.entries(database)
    ) {

        const industryNumber =
            industryData.industry ??
            Number(
                industryKey.replace(
                    "industry_",
                    ""
                )
            );


        const simulation =
            industryData.simulation || {};


        // ======================================
        // CANONICAL STARTING DATA — YEAR 10
        // ======================================

        const startingData =
            industryData.startingData || null;


        const startingDataInfo = {

            available:
                Boolean(startingData),

            year:
                startingData ? 10 : null,

            sharedAcrossCompanies:
                Boolean(startingData),

            FIR:
                Boolean(startingData?.FIR),

            CIR:
                Boolean(startingData?.CIR),

            COR:
                Boolean(startingData?.COR)

        };


        // FIR pages available in canonical Y10.

        const startingFirPages =
            startingData
                ?.FIR
                ?.normalizedData
                ?.pages;

        if (startingFirPages) {

            startingDataInfo.firPages =
                Object.keys(startingFirPages);

        }


        // CIR regions available in canonical Y10.

        const startingCirRegions =
            startingData
                ?.CIR
                ?.normalizedData
                ?.regions;

        if (startingCirRegions) {

            startingDataInfo.cirRegions =
                Object.keys(startingCirRegions);

        }


        // COR sections available in canonical Y10.

        const startingCorSections =
            startingData
                ?.COR
                ?.normalizedData
                ?.sections;

        if (startingCorSections) {

            const corSectionInfo = {};

            Object.entries(
                startingCorSections
            ).forEach(
                ([
                    sectionName,
                    sectionData
                ]) => {

                    corSectionInfo[
                        sectionName
                    ] = {

                        available:
                            true,

                        regions:
                            Object.keys(
                                sectionData
                                    ?.regions ||
                                {}
                            )

                    };

                }
            );


            startingDataInfo.corSections =
                corSectionInfo;

        }


        // ======================================
        // LIVE HISTORICAL YEARS — YEAR 11+
        // ======================================

        const liveYears = {};

        const years =
            industryData.years || {};


        for (
            const [
                yearKey,
                yearData
            ] of Object.entries(years)
        ) {

            const match =
                yearKey.match(
                    /^year_(\d+)$/
                );

            if (!match) {
                continue;
            }


            const yearNumber =
                Number(match[1]);


            // Year 10 must never exist here anymore.
            // It belongs exclusively to startingData.

            if (yearNumber === 10) {
                continue;
            }


            const yearOutput = {

                FIR:
                    Boolean(
                        yearData.FIR
                    ),

                CIR:
                    Boolean(
                        yearData.CIR
                    ),

                COR:
                    Boolean(
                        yearData.COR
                    )

            };


            // FIR pages

            const firPages =
                yearData
                    ?.FIR
                    ?.normalizedData
                    ?.pages;

            if (firPages) {

                yearOutput.firPages =
                    Object.keys(
                        firPages
                    );

            }


            // CIR regions

            const cirRegions =
                yearData
                    ?.CIR
                    ?.normalizedData
                    ?.regions;

            if (cirRegions) {

                yearOutput.cirRegions =
                    Object.keys(
                        cirRegions
                    );

            }


            // COR sections

            const corSections =
                yearData
                    ?.COR
                    ?.normalizedData
                    ?.sections;

            if (corSections) {

                const corSectionInfo = {};


                Object.entries(
                    corSections
                ).forEach(
                    ([
                        sectionName,
                        sectionData
                    ]) => {

                        corSectionInfo[
                            sectionName
                        ] = {

                            available:
                                true,

                            regions:
                                Object.keys(
                                    sectionData
                                        ?.regions ||
                                    {}
                                )

                        };

                    }
                );


                yearOutput.corSections =
                    corSectionInfo;

            }


            liveYears[
                yearNumber
            ] =
                yearOutput;

        }


        const liveHistoricalYears =
            Object.keys(liveYears)
                .map(Number)
                .sort(
                    (a, b) =>
                        a - b
                );


        // ======================================
        // CURRENT LIVE ROUND
        // ======================================

        const currentRound =
            currentDatabase[
                industryKey
            ] || null;


        const currentRoundInfo = {

            available:
                Boolean(currentRound),

            phase:
                currentRound?.phase ??
                simulation.phase ??
                null,

            year:
                currentRound?.currentYear ??
                simulation.currentYear ??
                null,

            company:
                currentRound?.company ??
                simulation.userCompany ??
                null,

            pages:
                Object.keys(
                    currentRound?.pages ||
                    {}
                )

        };


        // ======================================
        // PRACTICE ARCHIVE
        // ======================================
        //
        // IMPORTANT:
        // Only report that practice data exists.
        // Do NOT expose practice contents through
        // this normal live-data function.
        // ======================================

        const practiceArchive =
            practiceDatabase[
                industryKey
            ] || null;


        const practiceYears =
            Object.keys(
                practiceArchive?.years ||
                {}
            )
                .map(yearKey => {

                    const match =
                        yearKey.match(
                            /^year_(\d+)$/
                        );

                    return match
                        ? Number(match[1])
                        : null;

                })
                .filter(
                    year =>
                        Number.isInteger(year)
                )
                .sort(
                    (a, b) =>
                        a - b
                );


        // ======================================
        // INDUSTRY OUTPUT
        // ======================================

        output.industries[
            industryNumber
        ] = {

            industry:
                industryNumber,

            phase:
                simulation.phase ??
                null,

            currentYear:
                simulation.currentYear ??
                null,

            userCompany:
                simulation.userCompany ??
                null,

            simulation:
                simulation,

            startingData:
                startingDataInfo,

            liveHistoricalYears,

            liveYears,

            currentRound:
                currentRoundInfo,

            practiceArchive: {

                available:
                    Boolean(
                        practiceArchive
                    ),

                years:
                    practiceYears,

                access:
                    "explicit_tool_only"

            }

        };

    }


    return output;
}


// ==========================================
// GET ACTIVE INDUSTRY
// ==========================================

async function getActiveIndustry() {

    const database =
        await loadBSGDatabase();

    const industryKeys =
        Object.keys(database)
            .filter(
                key =>
                    key.startsWith(
                        "industry_"
                    )
            );


    const liveIndustryKey =
        industryKeys.find(
            key =>
                database[key]
                    ?.simulation
                    ?.phase === "live"
        );


    if (!liveIndustryKey) {

        throw new Error(
            "Unable to determine active live BSG industry."
        );

    }


    const industry =
        Number(
            database[liveIndustryKey]
                ?.simulation
                ?.industry ??
            liveIndustryKey.replace(
                "industry_",
                ""
            )
        );


    if (
        !Number.isInteger(industry)
    ) {

        throw new Error(
            "Active BSG industry is invalid."
        );

    }


    return industry;
}


// ==========================================
// GET FIR
// ==========================================

async function getFIR(
    industry,
    year,
    page = null
) {

    const yearData =
        await getYearData(
            industry,
            year
        );


    const fir =
        yearData?.FIR;


    if (!fir) {

        throw new Error(
            `FIR not found for Industry ${industry}, Year ${year}.`
        );

    }


    const normalized =
        fir.normalizedData;


    if (!normalized) {

        throw new Error(
            `Normalized FIR data not found for Year ${year}.`
        );

    }


    // Return full normalized FIR
    // if no page requested.

    if (!page) {

        return {
            industry,
            year,
            reportType: "FIR",

            metadata:
                normalized.metadata,

            companies:
                normalized.companies,

            pages:
                normalized.pages
        };

    }


    const pageData =
        normalized
            ?.pages
            ?.[page];


    if (!pageData) {

        throw new Error(
            `FIR page "${page}" not found for Year ${year}.`
        );

    }


    return {
        industry,
        year,
        reportType:
            "FIR",

        page,

        data:
            pageData
    };
}


// ==========================================
// GET CIR
// ==========================================

async function getCIR(
    industry,
    year,
    region = null,
    segment = null,
    company = null
) {

    const yearData =
        await getYearData(
            industry,
            year
        );


    const cir =
        yearData?.CIR;


    if (!cir) {

        throw new Error(
            `CIR not found for Industry ${industry}, Year ${year}.`
        );

    }


    const normalized =
        cir.normalizedData;


    if (!normalized) {

        throw new Error(
            `Normalized CIR data not found for Year ${year}.`
        );

    }


    // ======================================
    // RETURN FULL CIR
    // ======================================

    if (!region) {

        return {
            industry,
            year,
            reportType:
                "CIR",

            regions:
                normalized.regions
        };

    }


    const regionData =
        normalized
            ?.regions
            ?.[region];


    if (!regionData) {

        throw new Error(
            `CIR region "${region}" not found for Year ${year}.`
        );

    }


    // ======================================
    // RETURN REGION
    // ======================================

    if (!segment) {

        return {
            industry,
            year,
            reportType:
                "CIR",

            region,

            data:
                regionData
        };

    }


    const segmentData =
        regionData?.[segment];


    if (!segmentData) {

        throw new Error(
            `CIR segment "${segment}" not found in ${region}, Year ${year}.`
        );

    }


    // ======================================
    // RETURN SEGMENT
    // ======================================

    if (!company) {

        return {
            industry,
            year,
            reportType:
                "CIR",

            region,
            segment,

            data:
                segmentData
        };

    }


    const companyKey =
        String(company)
            .trim()
            .toUpperCase();


    const companyData =
        segmentData?.[companyKey];


    if (!companyData) {

        throw new Error(
            `Company ${companyKey} not found in ${region} ${segment}, Year ${year}.`
        );

    }


    // ======================================
    // RETURN COMPANY
    // ======================================

    return {
        industry,
        year,

        reportType:
            "CIR",

        region,

        segment,

        company:
            companyKey,

        data:
            companyData
    };
}


// ==========================================
// GET COR
// ==========================================

async function getCOR(
    industry,
    year,
    section = null,
    region = null
) {

    const yearData =
        await getYearData(
            industry,
            year
        );


    const cor =
        yearData?.COR;


    if (!cor) {

        throw new Error(
            `COR not found for Industry ${industry}, Year ${year}.`
        );

    }


    const normalized =
        cor.normalizedData;


    if (!normalized) {

        throw new Error(
            `Normalized COR data not found for Year ${year}.`
        );

    }


    // ======================================
    // RETURN FULL NORMALIZED COR
    // ======================================

    if (!section) {

        return {
            industry,
            year,

            reportType:
                "COR",

            metadata:
                normalized.metadata,

            sections:
                normalized.sections
        };

    }


    const sectionData =
        normalized
            ?.sections
            ?.[section];


    if (!sectionData) {

        throw new Error(
            `COR section "${section}" not found for Year ${year}.`
        );

    }


    // ======================================
    // RETURN SECTION
    // ======================================

    if (!region) {

        return {
            industry,
            year,

            reportType:
                "COR",

            company:
                normalized
                    ?.metadata
                    ?.companyLetter,

            section,

            data:
                sectionData
        };

    }


    const regionData =
        sectionData
            ?.regions
            ?.[region];


    if (!regionData) {

        throw new Error(
            `Region "${region}" not found in COR section "${section}".`
        );

    }


    // ======================================
    // RETURN SECTION + REGION
    // ======================================

    return {
        industry,
        year,

        reportType:
            "COR",

        company:
            normalized
                ?.metadata
                ?.companyLetter,

        section,

        region,

        data:
            regionData
    };
}


// ==========================================
// GET COMPANY HISTORY
// ==========================================

async function getCompanyHistory(
    industry,
    company,
    options = {}
) {

    const {
        startYear = 10,
        endYear = 20,
        regions = null,
        segments = null,
        includeFIR = true,
        includeCOR = true,
        firPages = null,
        corSections = null
    } = options;


    // ======================================
    // NORMALIZE REQUEST
    // ======================================

    const companyKey =
        String(company)
            .trim()
            .toUpperCase();


    const requestedRegions =
        regions == null
            ? null
            : (
                Array.isArray(regions)
                    ? regions
                    : [regions]
            )
            .map(region =>
                String(region)
                    .trim()
                    .toLowerCase()
            );


    const requestedSegments =
        segments == null
            ? null
            : (
                Array.isArray(segments)
                    ? segments
                    : [segments]
            )
            .map(segment =>
                String(segment)
                    .trim()
                    .toLowerCase()
            );

    
    const requestedFIRPages =
        firPages == null
            ? null
            : (
                Array.isArray(firPages)
                    ? firPages
                    : [firPages]
            )
            .map(page =>
                String(page)
                    .trim()
                    .toLowerCase()
            );


    const requestedCORSections =
        corSections == null
            ? null
            : (
                Array.isArray(corSections)
                    ? corSections
                    : [corSections]
            )
            .map(section =>
                String(section)
                    .trim()
                    .toLowerCase()
            );
     
    const validSegments = [
        "internet",
        "wholesale",
        "private_label"
    ];


    const selectedSegments =
        requestedSegments == null
            ? validSegments
            : validSegments.filter(segment =>
                requestedSegments.includes(
                    segment
                )
            );


    // ======================================
    // LOAD INDUSTRY
    // ======================================

    const industryData =
        await getIndustryData(
            industry
        );


    const output = {

        industry,

        company:
            companyKey,

        requestedRange: {
            startYear,
            endYear
        },

        startingBaseline:
            null,

        years: {}

    };


    // ======================================
    // HELPER — BUILD ONE YEAR
    // ======================================

    function buildYearOutput(
        yearData,
        {
            sharedBaseline = false
        } = {}
    ) {

        const yearOutput = {};


        // ==================================
        // CIR
        // ==================================

        const cirRegions =
            yearData
                ?.CIR
                ?.normalizedData
                ?.regions;


        if (cirRegions) {

            const regionOutput = {};


            for (
                const [
                    regionName,
                    regionData
                ] of Object.entries(
                    cirRegions
                )
            ) {

                // Apply region filter.

                if (
                    requestedRegions &&
                    !requestedRegions.includes(
                        String(regionName)
                            .trim()
                            .toLowerCase()
                    )
                ) {
                    continue;
                }


                const companyRegion = {};


                for (
                    const segment of
                    selectedSegments
                ) {

                    const companyData =
                        regionData
                            ?.[segment]
                            ?.[companyKey];


                    if (companyData) {

                        companyRegion[
                            segment
                        ] =
                            companyData;

                    }

                }


                if (
                    Object.keys(
                        companyRegion
                    ).length > 0
                ) {

                    regionOutput[
                        regionName
                    ] =
                        companyRegion;

                }

            }


            if (
                Object.keys(
                    regionOutput
                ).length > 0
            ) {

                yearOutput
                    .competitiveIntelligence = {

                    regions:
                        regionOutput

                };

            }

        }


        // ==================================
        // FIR
        // ==================================

        if (includeFIR) {

            const firPages =
                yearData
                    ?.FIR
                    ?.normalizedData
                    ?.pages;


            if (firPages) {

                const industryReport = {};


                for (
                    const [
                        pageName,
                        pageData
                    ] of Object.entries(
                        firPages
                    )
                ) {

                    if (
                        requestedFIRPages &&
                        !requestedFIRPages.includes(
                            String(pageName)
                                .trim()
                                .toLowerCase()
                        )
                    ) {
                        continue;
                    }

                    const matchingRows =
                        (
                            pageData.rows || []
                        )
                        .filter(row =>
                            row
                                ?.companyValues
                                ?.[companyKey] !==
                            undefined
                        )
                        .map(row => ({

                            label:
                                row.label,

                            context:
                                row.context ??
                                null,

                            value:
                                row
                                    .companyValues[
                                        companyKey
                                    ]

                        }));


                    if (
                        matchingRows.length > 0
                    ) {

                        industryReport[
                            pageName
                        ] =
                            matchingRows;

                    }

                }


                if (
                    Object.keys(
                        industryReport
                    ).length > 0
                ) {

                    yearOutput
                        .industryReport =
                            industryReport;

                }

            }

        }


        // ==================================
        // COR
        // ==================================

        if (includeCOR) {

            const cor =
                yearData
                    ?.COR
                    ?.normalizedData;


            if (cor) {

                const corCompany =
                    String(
                        cor
                            ?.metadata
                            ?.companyLetter ??
                        ""
                    )
                        .trim()
                        .toUpperCase();


                // For live historical years,
                // COR must belong to the
                // requested company.
                //
                // For canonical Y10, the stored
                // COR is allowed because Y10 is
                // explicitly treated as the
                // shared starting baseline.

                const corApplies =
                    sharedBaseline ||
                    corCompany ===
                        companyKey;


                if (corApplies) {

                    let selectedCORSections =
                        cor.sections;

                    if (
                        requestedCORSections &&
                        cor.sections
                    ) {

                        selectedCORSections =
                            Object.fromEntries(
                                Object.entries(
                                    cor.sections
                                )
                                .filter(
                                    ([sectionName]) =>
                                        requestedCORSections
                                            .includes(
                                                String(
                                                    sectionName
                                                )
                                                .trim()
                                                .toLowerCase()
                                            )
                                )
                            );

                    }

                    if (
                        selectedCORSections &&
                        Object.keys(
                            selectedCORSections
                        ).length > 0
                    ) {

                        yearOutput
                            .companyOperatingReport = {

                                metadata: {
                                    ...cor.metadata,

                                    sharedStartingBaseline:
                                        sharedBaseline
                                },

                                sections:
                                    selectedCORSections

                            };

                    }

                }

            }

        }


        return yearOutput;

    }


    // ======================================
    // YEAR 10 — SHARED STARTING BASELINE
    // ======================================

    const baselineYear = 10;


    if (
        industryData.startingData &&
        baselineYear >= startYear &&
        baselineYear <= endYear
    ) {

        const baselineData =
            buildYearOutput(
                industryData.startingData,
                {
                    sharedBaseline:
                        true
                }
            );


        output.startingBaseline = {

            year:
                baselineYear,

            sharedAcrossCompanies:
                true,

            canonicalSource:
                "startingData",

            data:
                baselineData

        };

    }


    // ======================================
    // LIVE HISTORICAL YEARS — YEAR 11+
    // ======================================

    const liveYears =
        industryData.years || {};


    const sortedLiveYears =
        Object.entries(
            liveYears
        )
        .map(
            ([
                yearKey,
                yearData
            ]) => {

                const match =
                    yearKey.match(
                        /^year_(\d+)$/
                    );


                if (!match) {
                    return null;
                }


                return {

                    year:
                        Number(
                            match[1]
                        ),

                    yearData

                };

            }
        )
        .filter(
            entry =>
                entry !== null
        )
        .sort(
            (a, b) =>
                a.year -
                b.year
        );


    for (
        const {
            year,
            yearData
        } of sortedLiveYears
    ) {

        // Year 10 is never considered
        // completed live history.

        if (year === 10) {
            continue;
        }


        // Apply requested year range.

        if (
            year < startYear ||
            year > endYear
        ) {
            continue;
        }


        output.years[
            year
        ] =
            buildYearOutput(
                yearData,
                {
                    sharedBaseline:
                        false
                }
            );

    }


    return output;

}


// ==========================================
// COMPARE COMPANIES
// ==========================================


async function compareCompanies(
    industry,
    companies,
    options = {}
) {
    if (
        !Array.isArray(companies) ||
        companies.length < 2
    ) {
        throw new Error(
            "compareCompanies requires at least two companies."
        );
    }


    const companyKeys = [
        ...new Set(
            companies.map(company =>
                String(company)
                    .trim()
                    .toUpperCase()
            )
        )
    ];


    const {
        year,
        regions = null,
        segments = null,
        includeFIR = true,
        includeCOR = true,
        firPages = null,
        corSections = null
    } = options;


    if (!Number.isFinite(year)) {
        throw new Error(
            "A valid comparison year is required."
        );
    }


    const comparison = {

        industry,

        year,

        companies: {}

    };


    for (
        const company of companyKeys
    ) {

        comparison.companies[
            company
        ] =
            await getCompanyHistory(
                industry,
                company,
                {
                    startYear: year,
                    endYear: year,

                    regions,
                    segments,

                    includeFIR,
                    includeCOR,

                    firPages,
                    corSections
                }
            );

    }


    return comparison;
}


// ==========================================
// GET PRACTICE DATA
// ==========================================

async function getPracticeData(
    industry,
    options = {}
) {

    const {
        year = null,
        dataType = "summary",
        reportType = null,
        page = null,
        region = null,
        segment = null
    } = options;


    // ======================================
    // LOAD PRACTICE ARCHIVE
    // ======================================

    const result =
        await chrome.storage.local.get(
            "bsgPracticeArchive"
        );


    const industryKey =
        `industry_${industry}`;


    const archive =
        result.bsgPracticeArchive
            ?.[industryKey];


    if (!archive) {

        throw new Error(
            `Practice archive not found for Industry ${industry}.`
        );

    }


    const archiveYears =
        archive.years || {};


    const availableYears =
        Object.keys(archiveYears)
            .map(key => {

                const match =
                    key.match(
                        /^year_(\d+)$/
                    );

                return match
                    ? Number(match[1])
                    : null;

            })
            .filter(year =>
                Number.isInteger(year)
            )
            .sort(
                (a, b) => a - b
            );


    // ======================================
    // SUMMARY
    // ======================================
    //
    // This intentionally returns inventory
    // metadata rather than practice contents.
    // ======================================

    if (dataType === "summary") {

        const yearSummary = {};


        for (
            const practiceYear of availableYears
        ) {

            const yearData =
                archiveYears[
                    `year_${practiceYear}`
                ] || {};


            yearSummary[
                practiceYear
            ] = {

                FIR:
                    Boolean(yearData.FIR),

                CIR:
                    Boolean(yearData.CIR),

                COR:
                    Boolean(yearData.COR),

                currentRoundPages:
                    Object.keys(
                        yearData.pages || {}
                    ),

                finalLeaderboard:
                    Boolean(
                        yearData.finalLeaderboard
                    )

            };

        }


        return {

            industry,

            phase:
                "practice",

            archived:
                true,

            availableYears,

            years:
                yearSummary

        };

    }


    // ======================================
    // VALIDATE YEAR
    // ======================================

    if (year == null) {

        throw new Error(
            "A practice year is required for targeted practice retrieval."
        );

    }


    const numericYear =
        Number(year);


    const yearData =
        archiveYears[
            `year_${numericYear}`
        ];


    if (!yearData) {

        throw new Error(
            `Practice Year ${numericYear} not found for Industry ${industry}.`
        );

    }


    // ======================================
    // FINAL LEADERBOARD
    // ======================================

    if (dataType === "final_leaderboard") {

        if (!yearData.finalLeaderboard) {

            throw new Error(
                `Final practice leaderboard not found for Year ${numericYear}.`
            );

        }


        return {

            industry,

            year:
                numericYear,

            phase:
                "practice",

            archived:
                true,

            dataType:
                "final_leaderboard",

            data:
                yearData.finalLeaderboard

        };

    }


    // ======================================
    // CURRENT-ROUND / DECISION PAGE
    // ======================================

    if (dataType === "decision_page") {

        if (!page) {

            return {

                industry,

                year:
                    numericYear,

                phase:
                    "practice",

                archived:
                    true,

                dataType:
                    "decision_page_inventory",

                availablePages:
                    Object.keys(
                        yearData.pages || {}
                    )

            };

        }


        const pageData =
            yearData.pages?.[page];


        if (!pageData) {

            throw new Error(
                `Practice decision page "${page}" not found for Year ${numericYear}.`
            );

        }


        return {

            industry,

            year:
                numericYear,

            phase:
                "practice",

            archived:
                true,

            dataType:
                "decision_page",

            page,

            data:
                pageData

        };

    }


    // ======================================
    // HISTORICAL REPORT
    // ======================================

    if (dataType === "report") {

        const normalizedReportType =
            String(
                reportType || ""
            )
                .trim()
                .toUpperCase();


        if (
            ![
                "FIR",
                "CIR",
                "COR"
            ].includes(
                normalizedReportType
            )
        ) {

            throw new Error(
                "Practice reportType must be FIR, CIR, or COR."
            );

        }


        const report =
            yearData[
                normalizedReportType
            ];


        if (!report) {

            throw new Error(
                `${normalizedReportType} not found in Practice Year ${numericYear}.`
            );

        }


        const normalized =
            report.normalizedData;


        if (!normalized) {

            throw new Error(
                `Normalized ${normalizedReportType} data not found in Practice Year ${numericYear}.`
            );

        }


        // ==================================
        // FIR
        // ==================================

        if (
            normalizedReportType === "FIR"
        ) {

            if (!page) {

                return {

                    industry,

                    year:
                        numericYear,

                    phase:
                        "practice",

                    archived:
                        true,

                    dataType:
                        "report",

                    reportType:
                        "FIR",

                    availablePages:
                        Object.keys(
                            normalized.pages || {}
                        )

                };

            }


            const pageData =
                normalized.pages?.[page];


            if (!pageData) {

                throw new Error(
                    `FIR page "${page}" not found in Practice Year ${numericYear}.`
                );

            }


            return {

                industry,

                year:
                    numericYear,

                phase:
                    "practice",

                archived:
                    true,

                dataType:
                    "report",

                reportType:
                    "FIR",

                page,

                data:
                    pageData

            };

        }


        // ==================================
        // CIR
        // ==================================

        if (
            normalizedReportType === "CIR"
        ) {

            if (!region) {

                return {

                    industry,

                    year:
                        numericYear,

                    phase:
                        "practice",

                    archived:
                        true,

                    dataType:
                        "report",

                    reportType:
                        "CIR",

                    availableRegions:
                        Object.keys(
                            normalized.regions || {}
                        )

                };

            }


            const regionData =
                normalized.regions?.[region];


            if (!regionData) {

                throw new Error(
                    `CIR region "${region}" not found in Practice Year ${numericYear}.`
                );

            }


            if (!segment) {

                return {

                    industry,

                    year:
                        numericYear,

                    phase:
                        "practice",

                    archived:
                        true,

                    dataType:
                        "report",

                    reportType:
                        "CIR",

                    region,

                    availableSegments:
                        Object.keys(
                            regionData || {}
                        )

                };

            }


            const segmentData =
                regionData?.[segment];


            if (!segmentData) {

                throw new Error(
                    `CIR segment "${segment}" not found in ${region}, Practice Year ${numericYear}.`
                );

            }


            return {

                industry,

                year:
                    numericYear,

                phase:
                    "practice",

                archived:
                    true,

                dataType:
                    "report",

                reportType:
                    "CIR",

                region,

                segment,

                data:
                    segmentData

            };

        }


        // ==================================
        // COR
        // ==================================

        if (
            normalizedReportType === "COR"
        ) {

            if (!page) {

                const sectionInfo = {};


                for (
                    const [
                        sectionName,
                        sectionData
                    ] of Object.entries(
                        normalized.sections || {}
                    )
                ) {

                    sectionInfo[
                        sectionName
                    ] = {

                        regions:
                            Object.keys(
                                sectionData
                                    ?.regions ||
                                {}
                            )

                    };

                }


                return {

                    industry,

                    year:
                        numericYear,

                    phase:
                        "practice",

                    archived:
                        true,

                    dataType:
                        "report",

                    reportType:
                        "COR",

                    availableSections:
                        sectionInfo

                };

            }


            const sectionData =
                normalized
                    .sections
                    ?.[page];


            if (!sectionData) {

                throw new Error(
                    `COR section "${page}" not found in Practice Year ${numericYear}.`
                );

            }


            if (!region) {

                return {

                    industry,

                    year:
                        numericYear,

                    phase:
                        "practice",

                    archived:
                        true,

                    dataType:
                        "report",

                    reportType:
                        "COR",

                    section:
                        page,

                    data:
                        sectionData

                };

            }


            const regionData =
                sectionData
                    ?.regions
                    ?.[region];


            if (!regionData) {

                throw new Error(
                    `Region "${region}" not found in practice COR section "${page}".`
                );

            }


            return {

                industry,

                year:
                    numericYear,

                phase:
                    "practice",

                archived:
                    true,

                dataType:
                    "report",

                reportType:
                    "COR",

                section:
                    page,

                region,

                data:
                    regionData

            };

        }

    }


    // ======================================
    // UNKNOWN REQUEST
    // ======================================

    throw new Error(
        `Unsupported practice dataType "${dataType}".`
    );

}


// ==========================================
// GET SIMULATION INFO
// ==========================================

async function getSimulationInfo(
    industry
) {

    const industryData =
        await getIndustryData(
            industry
        );


    if (!industryData.simulation) {

        throw new Error(
            `Simulation metadata not found for Industry ${industry}.`
        );

    }


    // ======================================
    // CANONICAL STARTING BASELINE
    // ======================================

    const startingDataAvailable =
        Boolean(
            industryData.startingData
        );


    // ======================================
    // COMPLETED LIVE HISTORICAL YEARS
    // ======================================

    const liveHistoricalYears =
        Object.keys(
            industryData.years || {}
        )
        .map(yearKey => {

            const match =
                yearKey.match(
                    /^year_(\d+)$/
                );

            return match
                ? Number(match[1])
                : null;

        })
        .filter(year =>
            Number.isInteger(year) &&
            year !== 10
        )
        .sort(
            (a, b) => a - b
        );


    // ======================================
    // RETURN SIMULATION INFORMATION
    // ======================================

    return {

        ...industryData.simulation,

        startingYear:
            10,

        startingDataAvailable,

        startingDataSharedAcrossCompanies:
            startingDataAvailable,

        liveHistoricalYears

    };

}


// ==================================
// PLAYER'S GUIDE
// ==================================

let playersGuideCache = null;


async function loadPlayersGuide() {

    if (playersGuideCache) {
        return playersGuideCache;
    }


    const url =
        chrome.runtime.getURL(
            "data/playersGuide.json"
        );


    const response =
        await fetch(url);


    if (!response.ok) {
        throw new Error(
            `Failed to load Player's Guide: ${response.status}`
        );
    }


    const guide =
        await response.json();


    if (!Array.isArray(guide.sections)) {
        throw new Error(
            "Invalid Player's Guide data: sections array not found."
        );
    }


    playersGuideCache = guide;

    return guide;
}


function normalizeGuideSearchText(value) {

    return String(value ?? "")
        .toLowerCase()
        .replace(/[’']/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function expandGuideSearchTerms(terms) {

    const synonymGroups = [
        [
            "ship",
            "ships",
            "shipped",
            "shipping"
        ],
        [
            "produce",
            "produced",
            "production"
        ],
        [
            "improve",
            "improved",
            "improvement",
            "improvements"
        ],
        [
            "bid",
            "bids",
            "bidding",
            "offer",
            "offers"
        ],
        [
            "award",
            "awarded",
            "contract",
            "contracts"
        ]
    ];


    const expanded =
        new Set(terms);


    for (const term of terms) {

        for (const group of synonymGroups) {

            if (group.includes(term)) {

                for (
                    const relatedTerm
                    of group
                ) {
                    expanded.add(
                        relatedTerm
                    );
                }

            }

        }

    }


    return [
        ...expanded
    ];
}


async function searchPlayersGuide(
    query,
    options = {}
) {

    const guide =
        await loadPlayersGuide();


    const normalizedQuery =
        normalizeGuideSearchText(query);


    if (!normalizedQuery) {
        throw new Error(
            "Player's Guide search query is required."
        );
    }


    const limit =
        Math.max(
            1,
            Math.min(
                Number(options.limit) || 3,
                5
            )
        );


    const guideStopWords =
        new Set([
            "a",
            "an",
            "and",
            "are",
            "be",
            "do",
            "does",
            "how",
            "in",
            "is",
            "of",
            "on",
            "the",
            "to",
            "what",
            "when",
            "where",
            "which",
            "who",
            "why",

            // Very common BSG terms that provide
            // little search discrimination.
            "company",
            "companies",
            "footwear",
            "branded"
        ]);


    const baseQueryTerms =
        normalizedQuery
            .split(" ")
            .filter(term =>
                term.length >= 3 &&
                !guideStopWords.has(term)
            );


    const queryTerms =
        expandGuideSearchTerms(
            baseQueryTerms
        );


    const scoredSections =
        guide.sections
            .map(section => {

                const title =
                    normalizeGuideSearchText(
                        section.title
                    );

                const parent =
                    normalizeGuideSearchText(
                        section.parentSection
                    );

                const keywords =
                    normalizeGuideSearchText(
                        Array.isArray(section.keywords)
                            ? section.keywords.join(" ")
                            : ""
                    );

                const text =
                    normalizeGuideSearchText(
                        section.text
                    );


                let score = 0;


                // Exact phrase matches are strongest.

                if (
                    title.includes(
                        normalizedQuery
                    )
                ) {
                    score += 40;
                }

                if (
                    keywords.includes(
                        normalizedQuery
                    )
                ) {
                    score += 25;
                }

                if (
                    text.includes(
                        normalizedQuery
                    )
                ) {
                    score += 15;
                }


                // Individual term matches.

                for (const term of queryTerms) {

                    if (title.includes(term)) {
                        score += 12;
                    }

                    if (parent.includes(term)) {
                        score += 6;
                    }

                    if (keywords.includes(term)) {
                        score += 8;
                    }

                    if (text.includes(term)) {
                        score += 2;
                    }
                }

                const matchedTerms =
                    queryTerms.filter(term =>
                        title.includes(term) ||
                        parent.includes(term) ||
                        keywords.includes(term) ||
                        text.includes(term)
                    ).length;


                if (matchedTerms >= 2) {
                    score +=
                        matchedTerms * 6;
                }


                return {
                    section,
                    score
                };

            })
            .filter(result =>
                result.score > 0
            )
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(
                0,
                limit
            );


    return {
        query,
        results:
            scoredSections.map(
                ({ section, score }) => {

                    const excerpt =
                        createGuideExcerpt(
                            section.text,
                            queryTerms
                        );


                    return {
                        sectionId:
                            section.id,

                        title:
                            section.title,

                        parentSection:
                            section.parentSection ??
                            null,

                        source:
                            "player_guide",

                        score,

                        excerpt
                    };

                }
            )
    };
}


function createGuideExcerpt(
    text,
    queryTerms
) {

    const cleanText =
        String(text ?? "")
            .replace(/\s+/g, " ")
            .trim();


    if (!cleanText) {
        return "";
    }


    const lowerText =
        cleanText.toLowerCase();


    let matchIndex = -1;


    for (const term of queryTerms) {

        const index =
            lowerText.indexOf(
                term.toLowerCase()
            );


        if (
            index !== -1 &&
            (
                matchIndex === -1 ||
                index < matchIndex
            )
        ) {
            matchIndex = index;
        }
    }


    if (matchIndex === -1) {
        matchIndex = 0;
    }


    const excerptLength = 500;

    const start =
        Math.max(
            0,
            matchIndex - 120
        );

    const end =
        Math.min(
            cleanText.length,
            start + excerptLength
        );


    let excerpt =
        cleanText.slice(
            start,
            end
        );


    if (start > 0) {
        excerpt = "..." + excerpt;
    }

    if (end < cleanText.length) {
        excerpt += "...";
    }


    return excerpt;
}


async function getPlayersGuideSection(
    sectionId
) {

    if (!sectionId) {
        throw new Error(
            "Player's Guide section ID is required."
        );
    }


    const guide =
        await loadPlayersGuide();


    const normalizedId =
        String(sectionId)
            .trim()
            .toLowerCase();


    const section =
        guide.sections.find(
            item =>
                String(item.id)
                    .toLowerCase() ===
                normalizedId
        );


    if (!section) {
        throw new Error(
            `Player's Guide section not found: ${sectionId}`
        );
    }


    return {
        sectionId:
            section.id,

        title:
            section.title,

        parentSection:
            section.parentSection ??
            null,

        source:
            "player_guide",

        text:
            section.text
    };
}



// ==========================================
// #region AGENT SESSION STATE
// ==========================================
//
// Stores live decision-workflow memory separately
// from historical BSG evidence and current
// decision-page snapshots.
//
// Session state tracks:
// - workflow progress across decision pages
// - accepted decisions and key projected results
// - round-level revisions for material decision changes
// - cross-page dependencies and evidence freshness
// - pages requiring revalidation after upstream changes
// - unresolved workflow/strategy issues
// - authoritative user corrections
//
// A material accepted-decision change increments
// the session revision and may invalidate dependent
// pages. Revalidation restores evidence freshness
// without changing the accepted decision state.
//
// Current BSG page data remains in
// bsgCurrentRoundData. Session state stores only
// compact decision/workflow memory and does not
// duplicate full page snapshots.
//
// bsgAgentSessionState
//   └── industry_42
//       ├── industry
//       ├── company
//       ├── phase
//       ├── year
//       ├── revision
//       ├── workflow
//       │   ├── currentPage
//       │   ├── completedPages
//       │   ├── needsRevalidation
//       │   └── unresolvedIssues
//       ├── pages
//       │   └── <page>
//       │       ├── status
//       │       ├── startedAt
//       │       ├── completedAt
//       │       ├── acceptedState
//       │       │   ├── decisions
//       │       │   ├── keyResults
//       │       │   └── acceptedAt
//       │       ├── acceptedRevision
//       │       ├── freshness
//       │       │   ├── status
//       │       │   └── staleBecause
//       │       ├── rationale
//       │       └── dependencies
//       └── userCorrections
//
// ==========================================


// ==========================================
// CREATE EMPTY PAGE STATE
// ==========================================

function createEmptyPageState() {

    return {

        status:
            "not_started",

        startedAt:
            null,

        completedAt:
            null,

        acceptedState:
            null,

        acceptedRevision:
            null,

        freshness: {

            status:
                "current",

            staleBecause:
                []

        },

        rationale:
            [],

        dependencies:
            []

    };
}


const addUnique =
        (
            array,
            value
        ) => {

            if (
                value &&
                !array.includes(value)
            ) {

                array.push(value);

            }

        };

// ==========================================
// INVALIDATE DEPENDENT PAGES
// ==========================================

function invalidateDependentPages(
    session,
    sourcePage,
    sourceRevision,
    reason = null
) {

    if (
        !session ||
        !sourcePage
    ) {

        return [];

    }


    const invalidatedPages =
        [];


    for (
        const [page, pageState]
        of Object.entries(session.pages || {})
    ) {

        // Never invalidate the page that
        // caused the change.

        if (
            page === sourcePage
        ) {

            continue;

        }


        if (
            !Array.isArray(
                pageState.dependencies
            ) ||
            !pageState.dependencies.includes(
                sourcePage
            )
        ) {

            continue;

        }


        if (
            !pageState.freshness
        ) {

            pageState.freshness = {
                status: "current",
                staleBecause: []
            };

        }


        if (
            !Array.isArray(
                pageState.freshness
                    .staleBecause
            )
        ) {

            pageState.freshness
                .staleBecause = [];

        }


        const duplicateCause =
            pageState.freshness
                .staleBecause
                .some(cause =>

                    cause.page ===
                        sourcePage &&

                    cause.revision ===
                        sourceRevision

                );


        if (!duplicateCause) {

            pageState.freshness
                .staleBecause
                .push({

                    page:
                        sourcePage,

                    revision:
                        sourceRevision,

                    reason:
                        reason ||
                        `Accepted decisions changed on ${sourcePage}.`,

                    markedAt:
                        new Date().toISOString()

                });

        }


        pageState.freshness.status =
            "stale";


        addUnique(
            session.workflow
                .needsRevalidation,
            page
        );


        invalidatedPages.push(
            page
        );

    }


    return invalidatedPages;
}


// ==========================================
// MATERIAL DECISION CHANGE
// ==========================================

function hasMaterialDecisionChange(
    previousDecisions,
    nextDecisions
) {

    if (
        !previousDecisions ||
        typeof previousDecisions !== "object"
    ) {

        return true;

    }


    if (
        !nextDecisions ||
        typeof nextDecisions !== "object"
    ) {

        return true;

    }


    return !deepEqualDecisionValues(
        previousDecisions,
        nextDecisions
    );
}


// ==========================================
// DEEP EQUAL DECISION VALUES
// ==========================================

function deepEqualDecisionValues(
    a,
    b
) {

    if (a === b) {

        return true;

    }


    if (
        a === null ||
        b === null ||
        typeof a !== "object" ||
        typeof b !== "object"
    ) {

        return false;

    }


    if (
        Array.isArray(a) !==
        Array.isArray(b)
    ) {

        return false;

    }


    if (
        Array.isArray(a)
    ) {

        if (
            a.length !== b.length
        ) {

            return false;

        }


        for (
            let i = 0;
            i < a.length;
            i++
        ) {

            if (
                !deepEqualDecisionValues(
                    a[i],
                    b[i]
                )
            ) {

                return false;

            }

        }


        return true;

    }


    const aKeys =
        Object.keys(a).sort();

    const bKeys =
        Object.keys(b).sort();


    if (
        aKeys.length !==
        bKeys.length
    ) {

        return false;

    }


    for (
        let i = 0;
        i < aKeys.length;
        i++
    ) {

        if (
            aKeys[i] !==
            bKeys[i]
        ) {

            return false;

        }


        const key =
            aKeys[i];


        if (
            !deepEqualDecisionValues(
                a[key],
                b[key]
            )
        ) {

            return false;

        }

    }


    return true;
}


// ==========================================
// CAN SNAPSHOT RESOLVE REVALIDATION
// ==========================================

function canSnapshotResolveRevalidation(
    session,
    page,
    snapshot
) {

    if (
        !session ||
        !page ||
        !snapshot
    ) {

        return false;

    }


    const pageState =
        session.pages?.[page];


    if (!pageState) {

        return false;

    }


    const freshness =
        pageState.freshness;


    if (!freshness) {

        return false;

    }


    // Nothing needs revalidation if the page
    // is already current.

    if (
        freshness.status !== "stale"
    ) {

        return false;

    }


    const snapshotRevision =
        Number(
            snapshot.sessionRevision
        );


    if (
        !Number.isInteger(
            snapshotRevision
        )
    ) {

        return false;

    }


    const staleCauses =
        Array.isArray(
            freshness.staleBecause
        )
            ? freshness.staleBecause
            : [];


    if (
        staleCauses.length === 0
    ) {

        return false;

    }


    // Snapshot must have been captured at or
    // after every revision that invalidated
    // this page.

    const coversAllStaleCauses =
        staleCauses.every(
            cause => {

                const causeRevision =
                    Number(
                        cause.revision
                    );

                const snapshotTime =
                    Date.parse(
                        snapshot.timestamp
                    );


                const causeTime =
                    Date.parse(
                        cause.markedAt
                    );


                const revisionIsNewEnough =
                    Number.isInteger(
                        causeRevision
                    ) &&
                    snapshotRevision >=
                        causeRevision;


                const timeIsNewEnough =
                    Number.isFinite(
                        snapshotTime
                    ) &&
                    Number.isFinite(
                        causeTime
                    )
                        ? snapshotTime >=
                            causeTime
                        : true;


                return (
                    revisionIsNewEnough &&
                    timeIsNewEnough
                );


            }
        );


    if (!coversAllStaleCauses) {

        return false;

    }


    return true;

}


// ==========================================
// CREATE EMPTY SESSION
// ==========================================

function createEmptyAgentSession(
    industry,
    company,
    year,
    
) {

    return {

        industry:
            Number(industry),

        company:
            String(company)
                .trim()
                .toUpperCase(),

        phase:
            "live",

        year:
            Number(year),

        revision:
            0,

        workflow: {

            currentPage:
                null,

            completedPages:
                [],

            needsRevalidation:
                [],

            unresolvedIssues:
                []

        },

        pages:
            {},

        userCorrections:
            []

    };
}


// ==========================================
// MIGRATE SESSION STATE
// ==========================================

function migrateAgentSessionState(
    session
) {

    if (!session) {

        return {
            session,
            changed: false
        };

    }


    let changed = false;


    if (
        !Number.isInteger(
            Number(session.revision)
        )
    ) {

        session.revision = 0;

        changed = true;

    }


    if (
        !session.pages ||
        typeof session.pages !== "object" ||
        Array.isArray(session.pages)
    ) {

        session.pages = {};

        changed = true;

    }


    // Remove legacy / noncanonical page records.
    for (
        const page of
        Object.keys(
            session.pages
        )
    ) {

        if (
            !AGENT_SESSION_PAGE_IDS.includes(
                page
            )
        ) {

            delete session.pages[
                page
            ];

            changed = true;

        }

    }


    // Normalize canonical page records.
    for (
        const pageState of
        Object.values(
            session.pages
        )
    ) {

        if (
            pageState.acceptedRevision ===
            undefined
        ) {

            pageState.acceptedRevision =
                null;

            changed = true;

        }


        if (!pageState.freshness) {

            pageState.freshness = {
                status: "current",
                staleBecause: []
            };

            changed = true;

        }


        if (
            !Array.isArray(
                pageState
                    .freshness
                    .staleBecause
            )
        ) {

            pageState
                .freshness
                .staleBecause = [];

            changed = true;

        }


        if (
            !Array.isArray(
                pageState.dependencies
            )
        ) {

            pageState.dependencies = [];

            changed = true;

        }

    }


    // Clean legacy page IDs from workflow arrays.
    if (
        session.workflow &&
        Array.isArray(
            session.workflow.completedPages
        )
    ) {

        const completedPages =
            session.workflow
                .completedPages
                .filter(
                    page =>
                        AGENT_SESSION_PAGE_IDS
                            .includes(
                                page
                            )
                );


        if (
            completedPages.length !==
            session.workflow
                .completedPages
                .length
        ) {

            session.workflow.completedPages =
                completedPages;

            changed = true;

        }

    }


    if (
        session.workflow &&
        Array.isArray(
            session.workflow
                .needsRevalidation
        )
    ) {

        const needsRevalidation =
            session.workflow
                .needsRevalidation
                .filter(
                    page =>
                        AGENT_SESSION_PAGE_IDS
                            .includes(
                                page
                            )
                );


        if (
            needsRevalidation.length !==
            session.workflow
                .needsRevalidation
                .length
        ) {

            session.workflow
                .needsRevalidation =
                needsRevalidation;

            changed = true;

        }

    }


    // A legacy currentPage should not survive migration.
    if (
        session.workflow
            ?.currentPage &&
        !AGENT_SESSION_PAGE_IDS.includes(
            session.workflow.currentPage
        )
    ) {

        session.workflow.currentPage =
            null;

        changed = true;

    }


    return {
        session,
        changed
    };

}

// ==========================================
// AGENT SESSION PAGE VALIDATION
// ==========================================

const AGENT_SESSION_PAGE_IDS = [
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
];


function validateSessionPageId(
    page
) {

    if (
        !AGENT_SESSION_PAGE_IDS.includes(
            page
        )
    ) {

        throw new Error(
            `Invalid session page ID: "${page}".`
        );

    }

}


function validateSessionDependencies(
    dependencies
) {

    // Dependencies are optional for actions
    // that do not update them.

    if (dependencies === undefined) {
        return;
    }


    if (!Array.isArray(dependencies)) {

        throw new Error(
            "Session dependencies must be an array."
        );

    }


    for (
        const dependency of
        dependencies
    ) {

        validateSessionPageId(
            dependency
        );

    }

}


// ==========================================
// GET SESSION STATE
// ==========================================

async function getAgentSessionState(
    industry
) {

    const result =
        await chrome.storage.local.get(
            "bsgAgentSessionState"
        );


    const database =
        result.bsgAgentSessionState ||
        {};


    const industryKey =
        `industry_${industry}`;


    const existing =
        database[
            industryKey
        ];


    if (!existing) {

        return null;

    }


    const migration =
        migrateAgentSessionState(
            existing
        );


    if (migration.changed) {

        database[
            industryKey
        ] =
            migration.session;


        await chrome.storage.local.set({

            bsgAgentSessionState:
                database

        });

    }


    return migration.session;

}


// ==========================================
// INITIALIZE SESSION
// ==========================================

async function initializeAgentSession(
    industry
) {

    const simulation =
        await getSimulationInfo(
            industry
        );


    if (
        simulation.phase &&
        simulation.phase !== "live"
    ) {

        throw new Error(
            "Agent decision sessions are only initialized for the live simulation."
        );

    }


    const company =
        simulation.userCompany;


    const year =
        Number(
            simulation.currentYear
        );


    if (
        !company ||
        !Number.isInteger(year)
    ) {

        throw new Error(
            "Simulation company or current year is unavailable."
        );

    }


    const result =
        await chrome.storage.local.get(
            "bsgAgentSessionState"
        );


    const database =
        result.bsgAgentSessionState ||
        {};


    const industryKey =
        `industry_${industry}`;


    const existing =
        database[industryKey];


    if (
        existing &&
        existing.phase === "live" &&
        Number(existing.year) === year &&
        String(existing.company)
            .trim()
            .toUpperCase() ===
            String(company)
                .trim()
                .toUpperCase()
    ) {

        const migration =
            migrateAgentSessionState(
                existing
            );


        if (migration.changed) {

            database[industryKey] =
                migration.session;


            await chrome.storage.local.set({

                bsgAgentSessionState:
                    database

            });

        }


        return migration.session;

    }


    const session =
        createEmptyAgentSession(
            industry,
            company,
            year
        );


    database[industryKey] =
        session;


    await chrome.storage.local.set({

        bsgAgentSessionState:
            database

    });


    return session;
}


// ==========================================
// SAVE SESSION STATE
// ==========================================

async function saveAgentSessionState(
    industry,
    session
) {

    if (!session) {

        throw new Error(
            "Agent session state is required."
        );

    }


    const result =
        await chrome.storage.local.get(
            "bsgAgentSessionState"
        );


    const database =
        result.bsgAgentSessionState ||
        {};


    const industryKey =
        `industry_${industry}`;


    database[industryKey] =
        session;


    await chrome.storage.local.set({

        bsgAgentSessionState:
            database

    });


    return session;
}


// ==========================================
// UPDATE AGENT SESSION STATE
// ==========================================

async function updateAgentSessionState(
    industry,
    action,
    payload = {}
) {

    const session =
        await initializeAgentSession(
            industry
        );


    if (!action) {

        throw new Error(
            "Session update action is required."
        );

    }


    const now =
        new Date().toISOString();


    switch (action) {


        // ==================================
        // START PAGE
        // ==================================

        case "start_page": {

            const page =
                payload.page;


            if (!page) {

                throw new Error(
                    "start_page requires page."
                );

            }


            session.workflow.currentPage =
                page;


            if (
                !session.pages[page]
            ) {

                session.pages[page] =
                    createEmptyPageState();

            }


            const pageState =
                session.pages[page];


            pageState.status =
                "in_progress";


            if (
                !pageState.startedAt
            ) {

                pageState.startedAt =
                    now;

            }


            break;

        }


        // ==================================
        // COMPLETE PAGE
        // ==================================

        case "complete_page": {

            const page =
                payload.page;


            if (!page) {

                throw new Error(
                    "complete_page requires page."
                );

            }

            validateSessionPageId(
                page
            );

            validateSessionDependencies(
                payload.dependencies
            );


            if (
                !session.pages[page]
            ) {

                session.pages[page] =
                    createEmptyPageState();

            }


            const pageState =
                session.pages[page];


            pageState.status =
                "complete";


            if (
                !pageState.startedAt
            ) {

                pageState.startedAt =
                    now;

            }


            pageState.completedAt =
                now;


            if (
                Array.isArray(
                    payload.rationale
                )
            ) {

                pageState.rationale =
                    payload.rationale;

            }


            if (
                Array.isArray(
                    payload.dependencies
                )
            ) {

                pageState.dependencies =
                    payload.dependencies;

            }


            addUnique(
                session.workflow
                    .completedPages,
                page
            );


            if (
                session.workflow
                    .currentPage === page
            ) {

                session.workflow.currentPage =
                    null;

            }


            break;

        }


        // ==================================
        // MARK FOR REVALIDATION
        // ==================================

        case "mark_for_revalidation": {

            const page =
                payload.page;


            if (!page) {

                throw new Error(
                    "mark_for_revalidation requires page."
                );

            }


            if (
                !session.pages[page]
            ) {

                session.pages[page] =
                    createEmptyPageState();

            }


            const pageState =
                session.pages[page];


            // Keep workflow tracking for quick access,
            // but freshness is the authoritative source
            // for whether page evidence is stale.

            addUnique(
                session.workflow
                    .needsRevalidation,
                page
            );


            pageState.freshness.status =
                "stale";


            const sourcePage =
                payload.sourcePage || null;


            const sourceRevision =
                Number.isInteger(
                    Number(payload.sourceRevision)
                )
                    ? Number(payload.sourceRevision)
                    : Number(session.revision || 0);


            const reason =
                payload.reason ||
                "Relevant upstream decision state changed.";


            // Avoid recording the same invalidation
            // more than once.

            const duplicateCause =
                pageState.freshness
                    .staleBecause
                    .some(cause =>

                        cause.page ===
                            sourcePage &&

                        cause.revision ===
                            sourceRevision

                    );


            if (!duplicateCause) {

                pageState.freshness
                    .staleBecause
                    .push({

                        page:
                            sourcePage,

                        revision:
                            sourceRevision,

                        reason,

                        markedAt:
                            now

                    });

            }


            break;

        }

        // ==================================
        // RESOLVE REVALIDATION
        // ==================================

        case "resolve_revalidation": {

            const page =
                payload.page;


            if (!page) {

                throw new Error(
                    "resolve_revalidation requires payload.page."
                );

            }


            const pageState =
                session.pages?.[
                    page
                ];


            if (!pageState) {

                throw new Error(
                    `Cannot resolve revalidation for unknown page "${page}".`
                );

            }


            if (
                pageState
                    .freshness
                    ?.status !== "stale"
            ) {

                throw new Error(
                    `Page "${page}" is not currently stale.`
                );

            }


            // Retrieve the latest observed BSG
            // snapshot for this page.

            const snapshot =
                await getCurrentPageSnapshot(
                    industry,
                    page
                );


            // A stale page can only be resolved
            // when the latest observed snapshot
            // is new enough to cover every known
            // invalidating decision change.

            const canResolve =
                canSnapshotResolveRevalidation(
                    session,
                    page,
                    snapshot
                );


            if (!canResolve) {

                throw new Error(
                    `Cannot resolve revalidation for "${page}". ` +
                    `The latest page snapshot is older than one or more ` +
                    `changes that invalidated its evidence. Revisit the ` +
                    `page so BSG can recalculate it, then retrieve it again.`
                );

            }


            pageState.freshness.status =
                "current";


            pageState.freshness.staleBecause =
                [];


            session.workflow.needsRevalidation =
                session.workflow
                    .needsRevalidation
                    .filter(
                        item =>
                            item !== page
                    );


            break;

        }


        // ==================================
        // ADD ISSUE
        // ==================================

        case "add_issue": {

            if (
                !payload.message
            ) {

                throw new Error(
                    "add_issue requires message."
                );

            }


            session.workflow
                .unresolvedIssues
                .push({

                    id:
                        payload.id ||
                        `issue_${Date.now()}`,

                    type:
                        payload.type ||
                        "general",

                    page:
                        payload.page ||
                        null,

                    message:
                        payload.message,

                    createdAt:
                        now

                });


            break;

        }


        // ==================================
        // RESOLVE ISSUE
        // ==================================

        case "resolve_issue": {

            if (
                !payload.id
            ) {

                throw new Error(
                    "resolve_issue requires id."
                );

            }


            session.workflow
                .unresolvedIssues =
                session.workflow
                    .unresolvedIssues
                    .filter(
                        issue =>
                            issue.id !==
                            payload.id
                    );


            break;

        }


        // ==================================
        // RECORD CORRECTION
        // ==================================

        case "record_correction": {

            const page =
                payload.page || null;

            const field =
                payload.field || null;

            const correction =
                payload.correction;


            if (
                correction === undefined ||
                correction === null ||
                (
                    typeof correction === "string" &&
                    !correction.trim()
                )
            ) {

                throw new Error(
                    "record_correction requires correction."
                );

            }


            const correctionRecord = {

                page,

                field,

                correction,

                reason:
                    payload.reason || null,

                source:
                    payload.source || "user",

                recordedAt:
                    now

            };


            const duplicateCorrection =
                session.userCorrections
                    .some(existing =>

                        existing.page === page &&

                        existing.field === field &&

                        deepEqualDecisionValues(
                            existing.correction,
                            correction
                        )

                    );


            if (!duplicateCorrection) {

                session.userCorrections.push(
                    correctionRecord
                );

            }


            break;

        }


        // ==================================
        // RECORD PAGE DECISIONS
        // ==================================

        case "record_page_decisions": {

            const page =
                payload.page;


            if (
                !page ||
                !payload.decisions ||
                typeof payload.decisions !==
                    "object" ||
                Array.isArray(payload.decisions)
            ) {

                throw new Error(
                    "record_page_decisions requires page and decisions."
                );

            }


            validateSessionPageId(
                page
            );

            validateSessionDependencies(
                payload.dependencies
            );


            if (
                !session.pages[page]
            ) {

                session.pages[page] =
                    createEmptyPageState();

            }


            const pageState =
                session.pages[page];


            // A material accepted-state change creates
            // a new round revision.

            const previousDecisions =
                pageState.acceptedState
                    ?.decisions || null;


            const materialChange =
                hasMaterialDecisionChange(
                    previousDecisions,
                    payload.decisions
                );


            if (materialChange) {

                session.revision =
                    Number(
                        session.revision || 0
                    ) + 1;

            }


            const acceptedRevision =
                materialChange
                    ? session.revision
                    : pageState.acceptedRevision;


            pageState.acceptedState = {

                decisions:
                    payload.decisions,

                keyResults:
                    (
                        payload.keyResults &&
                        typeof payload.keyResults ===
                            "object" &&
                        !Array.isArray(payload.keyResults)
                    )
                        ? payload.keyResults
                        : {},

                acceptedAt:
                    now

            };


            pageState.acceptedRevision =
                acceptedRevision;



            if (
                Array.isArray(
                    payload.rationale
                )
            ) {

                pageState.rationale =
                    payload.rationale;

            }


            if (
                Array.isArray(
                    payload.dependencies
                )
            ) {

                pageState.dependencies =
                    payload.dependencies;

            }

            if (materialChange) {

                invalidateDependentPages(
                    session,
                    page,
                    acceptedRevision,
                    `Accepted decisions changed on ${page}.`
                );

            }


            break;

        }


        case "set_page_dependencies": {

            const page =
                payload.page;


            if (!page) {

                throw new Error(
                    "set_page_dependencies requires payload.page."
                );

            }


            validateSessionPageId(
                page
            );


            if (
                !Array.isArray(
                    payload.dependencies
                )
            ) {

                throw new Error(
                    "set_page_dependencies requires payload.dependencies."
                );

            }


            validateSessionDependencies(
                payload.dependencies
            );


            if (!session.pages[page]) {

                session.pages[page] =
                    createEmptyPageState();

            }


            session.pages[
                page
            ].dependencies = [
                ...new Set(
                    payload.dependencies
                )
            ];


            break;

        }


        // ==================================
        // UNKNOWN ACTION
        // ==================================

        default:

            throw new Error(
                `Unknown agent session action: ${action}`
            );

    }


    await saveAgentSessionState(
        industry,
        session
    );


    return session;
}


// ==========================================
// RESET AGENT SESSION STATE
// ==========================================

async function resetAgentSession(
    industry,
    confirmReset = false
) {

    if (confirmReset !== true) {

        throw new Error(
            "resetAgentSession requires explicit confirmation."
        );

    }

    const result =
        await chrome.storage.local.get(
            "bsgAgentSessionState"
        );


    const database =
        result.bsgAgentSessionState ?? {};


    const industryKey =
        `industry_${industry}`;


    // Remove only this industry's agent session.
    delete database[
        industryKey
    ];


    await chrome.storage.local.set({
        bsgAgentSessionState:
            database
    });


    // Recreate a clean session using
    // current live simulation metadata.
    return await initializeAgentSession(
        industry
    );

}


// ==================================
// PERSISTENT MECHANICS KNOWLEDGE
// ==================================

async function loadMechanicsKnowledge() {

    const result =
        await chrome.storage.local.get(
            "bsgMechanicsKnowledge"
        );

    return (
        result.bsgMechanicsKnowledge ?? {
            version: 1,
            findings: []
        }
    );
}


async function saveMechanicsKnowledge(
    knowledge
) {

    await chrome.storage.local.set({
        bsgMechanicsKnowledge: knowledge
    });

    return knowledge;
}


async function recordMechanicsFinding(
    finding
) {

    if (!finding || typeof finding !== "object") {
        throw new Error(
            "Mechanics finding must be an object."
        );
    }


    const allowedSourceTypes =
        new Set([
            "player_guide",
            "controlled_experiment",
            "observed_ui",
            "historical_inference",
            "user_correction"
        ]);


    const allowedConfidenceLevels =
        new Set([
            "low",
            "medium",
            "high"
        ]);


    const topic =
        String(
            finding.topic ?? ""
        ).trim();


    const claim =
        String(
            finding.claim ?? ""
        ).trim();


    const sourceType =
        String(
            finding.sourceType ?? ""
        ).trim();


    const confidence =
        String(
            finding.confidence ?? ""
        ).trim();


    if (!topic) {
        throw new Error(
            "Mechanics finding topic is required."
        );
    }


    if (!claim) {
        throw new Error(
            "Mechanics finding claim is required."
        );
    }


    if (
        !allowedSourceTypes.has(
            sourceType
        )
    ) {
        throw new Error(
            `Invalid mechanics source type: ${sourceType}`
        );
    }


    if (
        !allowedConfidenceLevels.has(
            confidence
        )
    ) {
        throw new Error(
            `Invalid mechanics confidence: ${confidence}`
        );
    }


    const knowledge =
        await loadMechanicsKnowledge();


    const now =
        new Date().toISOString();


    const record = {

        id:
            crypto.randomUUID(),

        topic,

        claim,

        sourceType,

        sourceContext:
            finding.sourceContext &&
            typeof finding.sourceContext === "object"
                ? finding.sourceContext
                : {},

        confidence,

        evidence:
            String(
                finding.evidence ?? ""
            ).trim(),

        createdAt:
            now,

        updatedAt:
            now
    };


    knowledge.findings.push(
        record
    );


    await saveMechanicsKnowledge(
        knowledge
    );


    return record;
}


async function searchMechanicsKnowledge(
    query,
    options = {}
) {

    const knowledge =
        await loadMechanicsKnowledge();


    const normalizedQuery =
        normalizeMechanicsSearchText(
            query
        );


    if (!normalizedQuery) {
        throw new Error(
            "Mechanics knowledge search query is required."
        );
    }


    const limit =
        Math.max(
            1,
            Math.min(
                Number(options.limit) || 5,
                10
            )
        );


    const mechanicsStopWords =
        new Set([
            "a",
            "an",
            "and",
            "are",
            "be",
            "did",
            "do",
            "does",
            "from",
            "how",
            "in",
            "is",
            "it",
            "of",
            "on",
            "the",
            "to",
            "was",
            "were",
            "what",
            "when",
            "where",
            "which",
            "who",
            "why",
            "we"
        ]);


    const queryTerms =
        normalizedQuery
            .split(" ")
            .filter(term =>
                term.length >= 3 &&
                !mechanicsStopWords.has(term)
            );


    const sourceTypeFilter =
        options.sourceType ?? null;


    const confidenceFilter =
        options.confidence ?? null;


    const scoredFindings =
        knowledge.findings
            .filter(finding => {

                if (
                    sourceTypeFilter &&
                    finding.sourceType !==
                        sourceTypeFilter
                ) {
                    return false;
                }


                if (
                    confidenceFilter &&
                    finding.confidence !==
                        confidenceFilter
                ) {
                    return false;
                }


                return true;
            })
            .map(finding => {

                const topic =
                    normalizeMechanicsSearchText(
                        finding.topic
                    );


                const claim =
                    normalizeMechanicsSearchText(
                        finding.claim
                    );


                const evidence =
                    normalizeMechanicsSearchText(
                        finding.evidence
                    );


                const sourceContext =
                    normalizeMechanicsSearchText(
                        flattenMechanicsSourceContext(
                            finding.sourceContext
                        )
                    );


                let score = 0;


                // Exact query matches.

                if (
                    topic.includes(
                        normalizedQuery
                    )
                ) {
                    score += 40;
                }


                if (
                    claim.includes(
                        normalizedQuery
                    )
                ) {
                    score += 30;
                }


                if (
                    evidence.includes(
                        normalizedQuery
                    )
                ) {
                    score += 15;
                }


                // Individual term matches.

                for (const term of queryTerms) {

                    if (topic.includes(term)) {
                        score += 12;
                    }


                    if (claim.includes(term)) {
                        score += 10;
                    }


                    if (evidence.includes(term)) {
                        score += 4;
                    }


                    if (
                        sourceContext.includes(
                            term
                        )
                    ) {
                        score += 2;
                    }
                }


                const matchedTerms =
                    queryTerms.filter(term =>
                        topic.includes(term) ||
                        claim.includes(term) ||
                        evidence.includes(term) ||
                        sourceContext.includes(term)
                    ).length;


                if (matchedTerms >= 2) {
                    score +=
                        matchedTerms * 5;
                }


                return {
                    finding,
                    score
                };
            })
            .filter(result =>
                result.score > 0
            )
            .sort((a, b) => {

                if (b.score !== a.score) {
                    return (
                        b.score -
                        a.score
                    );
                }


                return (
                    new Date(
                        b.finding.updatedAt
                    ).getTime() -
                    new Date(
                        a.finding.updatedAt
                    ).getTime()
                );
            })
            .slice(
                0,
                limit
            );


    return {
        query,

        filters: {
            sourceType:
                sourceTypeFilter,

            confidence:
                confidenceFilter
        },

        results:
            scoredFindings.map(
                ({ finding, score }) => ({
                    id:
                        finding.id,

                    topic:
                        finding.topic,

                    claim:
                        finding.claim,

                    sourceType:
                        finding.sourceType,

                    sourceContext:
                        finding.sourceContext,

                    confidence:
                        finding.confidence,

                    evidence:
                        finding.evidence,

                    score,

                    createdAt:
                        finding.createdAt,

                    updatedAt:
                        finding.updatedAt
                })
            )
    };
}


function normalizeMechanicsSearchText(
    value
) {

    return String(
        value ?? ""
    )
        .toLowerCase()
        .replace(
            /['’]/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function flattenMechanicsSourceContext(
    sourceContext
) {

    if (
        !sourceContext ||
        typeof sourceContext !== "object"
    ) {
        return "";
    }


    return Object.entries(
        sourceContext
    )
        .map(
            ([key, value]) =>
                `${key} ${String(value)}`
        )
        .join(" ");
}
//#endregion

//#region flag for later
async function setCurrentYear(
    industry,
    year
) {

    const result =
        await chrome.storage.local.get(
            ["bsgHistoricalData"]
        );


    const database =
        result.bsgHistoricalData ||
        {};


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


    industryData
        .simulation
        .currentYear =
        Number(year);


    await chrome.storage.local.set({

        bsgHistoricalData:
            database

    });


    return {
        industry,
        currentYear:
            Number(year)
    };
}
//#endregion


function calculateChanges(
    calculations
) {
    if (
        !Array.isArray(calculations) ||
        calculations.length === 0
    ) {
        throw new Error(
            "At least one calculation is required."
        );
    }


    return {
        calculations:
            calculations.map(item => {

                const startValue =
                    Number(item.startValue);

                const endValue =
                    Number(item.endValue);


                if (
                    !Number.isFinite(startValue) ||
                    !Number.isFinite(endValue)
                ) {
                    throw new Error(
                        `Invalid values for calculation: ${
                            item.label ?? "unlabeled"
                        }`
                    );
                }


                const absoluteChange =
                    endValue - startValue;


                const percentChange =
                    startValue !== 0
                        ? (
                            absoluteChange /
                            Math.abs(startValue)
                        ) * 100
                        : null;


                return {

                    label:
                        item.label ?? null,

                    startValue,

                    endValue,

                    absoluteChange,

                    percentChange

                };

            })
    };
}


async function compareProjectionToActual(
    industry,
    year,
    options = {}
) {
    const {
        pages = null,
        firPages = null,
        corSections = null,
        regions = null,
        segments = null
    } = options;


    const snapshot =
        await getFinalDecisionSnapshot(
            industry,
            year
        );


    if (!snapshot?.available) {
        throw new Error(
            `No final decision snapshot is available for Year ${year}.`
        );
    }


    const requestedPages =
        pages == null
            ? null
            : (
                Array.isArray(pages)
                    ? pages
                    : [pages]
            );


    let projectedPages =
        snapshot.pages ?? {};


    if (requestedPages) {

        projectedPages =
            Object.fromEntries(
                Object.entries(
                    projectedPages
                ).filter(
                    ([pageName]) =>
                        requestedPages.includes(
                            pageName
                        )
                )
            );

    }


    const actual =
        await getCompanyHistory(
            industry,
            snapshot.company,
            {
                startYear:
                    year,

                endYear:
                    year,

                regions,

                segments,

                includeFIR:
                    true,

                includeCOR:
                    true,

                firPages,

                corSections
            }
        );


    return {
        industry,
        year,

        company:
            snapshot.company,

        projection: {
            capturedAt:
                snapshot.capturedAt,

            pages:
                projectedPages
        },

        actual
    };
}

async function saveCurrentPageSnapshot(
    pageData
) {

    if (!pageData?.currentRound) {
        throw new Error(
            "Current-round data is missing."
        );
    }


    const industry =
        await getActiveIndustry();


    if (!industry) {
        throw new Error(
            "No active BSG industry is available."
        );
    }


    const result =
        await chrome.storage.local.get(
            [
                "bsgHistoricalData",
                "bsgCurrentRoundData"
            ]
        );


    const historicalDatabase =
        result.bsgHistoricalData || {};

    const currentDatabase =
        result.bsgCurrentRoundData || {};


    const industryKey =
        `industry_${industry}`;


    const industryEntry =
        historicalDatabase[
            industryKey
        ];


    if (!industryEntry) {
        throw new Error(
            `No historical data is loaded for industry ${industry}.`
        );
    }


    const simulation =
        industryEntry.simulation || {};


    const year =
        pageData.currentRound.year ??
        simulation.currentYear ??
        null;


    const company =
        simulation.userCompany ??
        "H";


    const phase =
        simulation.phase ??
        null;


    // Read the existing session only.
    // Saving a page snapshot should not
    // initialize workflow state.

    const session =
        await getAgentSessionState(
            industry
        );


    const sessionRevision =
        Number.isInteger(
            Number(session?.revision)
        )
            ? Number(session.revision)
            : null;


    if (
        !currentDatabase[
            industryKey
        ]
    ) {

        currentDatabase[
            industryKey
        ] = {

            industry,

            company,

            phase,

            currentYear:
                year,

            pages: {}

        };

    }


    const industryData =
        currentDatabase[
            industryKey
        ];


    industryData.company =
        company;

    industryData.phase =
        phase;

    industryData.currentYear =
        year;


    const pageKey =
        pageData
            .currentRound
            .decisionType ||
        pageData
            .currentRound
            .pageType ||
        "unknown";


    industryData.pages[
        pageKey
    ] = {

        timestamp:
            pageData.timestamp,

        sessionRevision,

        url:
            pageData.url,

        pageTitle:
            pageData.pageTitle,

        ...pageData.currentRound

    };


    await chrome.storage.local.set({

        bsgCurrentRoundData:
            currentDatabase

    });


    return industryData.pages[
        pageKey
    ];

}

async function getCurrentPageSnapshot(
    industry,
    pageType = null
) {

    const result =
        await chrome.storage.local.get(
            [
                "bsgCurrentRoundData"
            ]
        );


    const database =
        result.bsgCurrentRoundData ||
        {};


    const industryKey =
        `industry_${industry}`;


    const industryData =
        database[
            industryKey
        ];


    if (!industryData) {

        throw new Error(
            `No current-round data found for Industry ${industry}.`
        );

    }


    if (pageType) {

        const page =
            industryData
                .pages?.[
                    pageType
                ];

        if (!page) {

            throw new Error(
                `Current-round page "${pageType}" not found.`
            );

        }

        return page;

    }


    return {

        industry:
            industryData.industry,

        company:
            industryData.company,

        phase:
            industryData.phase,

        currentYear:
            industryData.currentYear,

        availablePages:
            Object.keys(
                industryData.pages ||
                {}
            ),

        pages:
            industryData.pages ||
            {}

    };

}

async function saveLobbySnapshot(
    industry,
    lobbyData
) {
    if (!industry) {
        throw new Error(
            "Industry is required to save lobby snapshot."
        );
    }

    if (
        !lobbyData ||
        lobbyData.page !== "corporate_lobby"
    ) {
        throw new Error(
            "Invalid Corporate Lobby data."
        );
    }

    const decisionYear =
        lobbyData.simulation?.decisionYear;

    if (!Number.isFinite(decisionYear)) {
        throw new Error(
            "Corporate Lobby snapshot is missing decision year."
        );
    }

    const industryKey =
        `industry_${industry}`;

    const stored =
        await chrome.storage.local.get(
            "bsgCurrentRoundData"
        );

    const database =
        stored.bsgCurrentRoundData ?? {};

    const existing =
        database[industryKey] ?? {};

    database[industryKey] = {
        ...existing,

        industry,
        company:
            existing.company ?? null,

        phase: "live",
        currentYear: decisionYear,

        pages:
            existing.pages ?? {},

        lobby: {
            capturedAt:
                new Date().toISOString(),

            scoreboard:
                lobbyData.scoreboard ?? null,

            interestRates:
                lobbyData.interestRates ?? null,

            exchangeRates:
                lobbyData.exchangeRates ?? null
        }
    };

    await chrome.storage.local.set({
        bsgCurrentRoundData: database
    });

    return database[industryKey].lobby;
}

async function saveFinalDecisionSnapshot(
    industry
) {

    
    const industryKey =
        `industry_${industry}`;

    const currentStored =
        await chrome.storage.local.get(
            "bsgCurrentRoundData"
        );

    const historicalStored =
        await chrome.storage.local.get(
            "bsgHistoricalData"
        );

    const currentDatabase =
        currentStored.bsgCurrentRoundData ?? {};

    const historicalDatabase =
        historicalStored.bsgHistoricalData ?? {};

    const currentRound =
        currentDatabase[industryKey];

    if (!currentRound) {
        throw new Error(
            `No current-round data found for Industry ${industry}.`
        );
    }

    const year =
        currentRound.currentYear;

    if (!Number.isFinite(year)) {
        throw new Error(
            "Current round is missing a valid year."
        );
    }

    const pages =
        currentRound.pages ?? {};

    if (
        Object.keys(pages).length === 0
    ) {
        throw new Error(
            "No current decision pages are available to snapshot."
        );
    }

    const requiredPages = AGENT_SESSION_PAGE_IDS;

    const missingPages =
        requiredPages.filter(
            page =>
                !pages[page]
        );

    if (missingPages.length > 0) {
        throw new Error(
            `Cannot create final snapshot. Missing pages: ${
                missingPages.join(", ")
            }`
        );
    }


    const industryData =
        historicalDatabase[industryKey];

    if (!industryData) {
        throw new Error(
            `No historical database found for Industry ${industry}.`
        );
    }

    const yearKey =
        `year_${year}`;

    industryData.years =
        industryData.years ?? {};

    industryData.years[yearKey] =
        industryData.years[yearKey] ?? {};

    const existingSnapshot =
        industryData
            .years
            ?.[yearKey]
            ?.finalDecisionSnapshot;

    if (existingSnapshot) {
        throw new Error(
            `A final decision snapshot already exists for Year ${year}.`
        );
    }

    industryData.years[
        yearKey
    ].finalDecisionSnapshot = {

        capturedAt:
            new Date().toISOString(),

        company:
            currentRound.company ?? null,

        year,

        pages:
            structuredClone(pages)

    };

    await chrome.storage.local.set({
        bsgHistoricalData:
            historicalDatabase
    });

    return industryData
        .years[yearKey]
        .finalDecisionSnapshot;
}

async function getFinalDecisionSnapshot(
    industry,
    year,
    pageType = null
) {
    const industryData =
        await getIndustryData(
            industry
        );

    const yearData =
        industryData
            ?.years
            ?.[`year_${year}`];

    const snapshot =
        yearData
            ?.finalDecisionSnapshot;

    if (!snapshot) {
        return {
            available: false,
            industry,
            year,
            reason:
                "No final decision snapshot is available for this year."
        };
    }

    if (pageType) {

        const page =
            snapshot.pages
                ?.[pageType];

        if (!page) {
            return {
                available: false,
                industry,
                year,
                pageType,
                reason:
                    `No final snapshot found for page '${pageType}'.`
            };
        }

        return {
            available: true,
            industry,
            year,
            capturedAt:
                snapshot.capturedAt,
            company:
                snapshot.company,
            pageType,
            page
        };
    }

    return {
        available: true,
        industry,
        year,
        capturedAt:
            snapshot.capturedAt,
        company:
            snapshot.company,
        pages:
            snapshot.pages
    };
}



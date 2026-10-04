// ==========================================
// TOOL EXECUTOR
// ==========================================

async function executeBSGTool(
    toolName,
    args = {}
) {

    console.log(
        `BSG Agent Tool Call: ${toolName}`,
        JSON.stringify(
            args,
            null,
            2
        )
    );


    switch (toolName) {


        // ==================================
        // GET CURRENT PAGE
        // ==================================

        case "get_current_page": {

            const industry =
                await getActiveIndustry();


            const pageType =
                args.pageType || null;


            const snapshot =
                await getCurrentPageSnapshot(
                    industry,
                    pageType
                );


            const session =
                await getAgentSessionState(
                    industry
                );


            // If no specific page was requested,
            // return the normal current-round summary.
            //
            // Freshness validation only applies
            // cleanly to a specific page snapshot.

            if (!pageType) {

                return snapshot;

            }


            const pageState =
                session?.pages?.[
                    pageType
                ] || null;


            const canResolveRevalidation =
                canSnapshotResolveRevalidation(
                    session,
                    pageType,
                    snapshot
                );


            return {

                snapshot,

                evidenceFreshness: {

                    status:
                        pageState
                            ?.freshness
                            ?.status ??
                        "unknown",

                    snapshotRevision:
                        snapshot
                            ?.sessionRevision ??
                        null,

                    currentSessionRevision:
                        session
                            ?.revision ??
                        null,

                    canResolveRevalidation,

                    staleBecause:
                        Array.isArray(
                            pageState
                                ?.freshness
                                ?.staleBecause
                        )
                            ? pageState
                                .freshness
                                .staleBecause
                            : []

                }

            };

        }


        // ==================================
        // AVAILABLE DATA
        // ==================================

        case "get_available_data": {
            const result =
                await getAvailableData();

            return compactAvailableDataForAgent(
                result
            );
        }

        // ==================================
        // PRACTICE ARCHIVE
        // ==================================

        case "get_practice_data": {
            const industry = await getActiveIndustry();

            return await getPracticeData(
                industry,
                {
                    year: args.year ?? null,

                    dataType: args.dataType,

                    reportType: args.reportType ?? null,

                    page: args.page ?? null,

                    region: args.region ?? null,

                    segment: args.segment ?? null
                }
            );
        }


        // ==================================
        // GET RATES
        // ==================================

        case "get_rates": {

            const industry =
                await getActiveIndustry();

            return await getRates(
                industry,
                args
            );

        }

        // ==================================
        // PLAYER'S GUIDE SEARCH
        // ==================================

        case "search_players_guide": {

            return await searchPlayersGuide(
                args.query,
                {
                    limit: 3
                }
            );

        }


        // ==================================
        // PLAYER'S GUIDE SECTION
        // ==================================

        case "get_players_guide_section": {

            return await getPlayersGuideSection(
                args.sectionId
            );

        }


        // ==================================
        // MECHANICS KNOWLEDGE SEARCH
        // ==================================

        case "search_mechanics_knowledge": {
            return await searchMechanicsKnowledge(
                args.query,
                {
                    sourceType:
                        args.sourceType ?? null,

                    confidence:
                        args.confidence ?? null,

                    limit: 5
                }
            );
        }


        // ==================================
        // RECORD MECHANICS FINDING
        // ==================================

        case "record_mechanics_finding": {
            return await recordMechanicsFinding({
                topic:
                    args.topic,

                claim:
                    args.claim,

                sourceType:
                    args.sourceType,

                sourceContext:
                    args.sourceContext ?? {},

                confidence:
                    args.confidence,

                evidence:
                    args.evidence ?? ""
            });
        }


        // ==================================
        // FIR
        // ==================================

        case "get_fir": {

            const industry =
                await getActiveIndustry();

            const result =
                await getFIR(
                    industry,
                    args.year,
                    args.page ?? null
                );

            const compacted =
                compactFIRForAgent(result);

            return projectFIRCompaniesForAgent(
                compacted,
                args.companies
            );
        }


        // ==================================
        // CIR
        // ==================================

        case "get_cir": {

            const industry = await getActiveIndustry();

            return await getCIR(
                industry,
                args.year,
                args.region ?? null,
                args.segment ?? null,
                args.company ?? null
            );
        }


        // ==================================
        // COR
        // ==================================

        case "get_cor": {

            const industry =
                await getActiveIndustry();

            const result = await getCOR(
                industry,
                args.year,
                args.section ?? null,
                args.region ?? null
            );
            return compactCORForAgent(
                args.section,
                result
            );
        }

        // ==================================
        // COMPANY HISTORY
        // ==================================

        case "get_company_history": {

            const industry = 
                await getActiveIndustry();

            const options = {

                startYear:
                    args.startYear,

                endYear:
                    args.endYear,

                regions:
                    args.regions ?? null,

                segments:
                    args.segments ?? null,

                includeFIR:
                    args.includeFIR ?? true,

                includeCOR:
                    args.includeCOR ?? true,

                firPages:
                    args.firPages ?? null,

                corSections:
                    args.corSections ?? null
                
            };


            const result = await getCompanyHistory(
                industry,
                args.company,
                options
            );


            return compactCompanyHistoryForAgent(result)

        };

        // ==================================
        // COMPARE COMPANIES
        // ==================================

        case "compare_companies": {

            const industry =
                await getActiveIndustry();

            const options = {

                year:
                    args.year,

                regions:
                    args.regions ?? null,

                segments:
                    args.segments ?? null,

                includeFIR:
                    args.includeFIR ?? true,

                includeCOR:
                    args.includeCOR ?? true,

                firPages:
                    args.firPages ?? null,

                corSections:
                    args.corSections ?? null

            };


            return await compareCompanies(
                industry,
                args.companies,
                options
            );
        }

        case "calculate_change": {

            return calculateChanges(
                args.calculations
            );

        }

        case "compare_projection_to_actual": {
            const industry =
                await getActiveIndustry();

            const options = {
                pages:
                    args.pages ?? null,

                firPages:
                    args.firPages ?? null,

                corSections:
                    args.corSections ?? null,

                regions:
                    args.regions ?? null,

                segments:
                    args.segments ?? null
            };

            return await compareProjectionToActual(
                industry,
                args.year,
                options
            );
        }


        // ==================================
        // GET SESSION STATE
        // ==================================

        case "get_session_state": {

            const industry =
                await getActiveIndustry();

            return await getAgentSessionState(
                industry
            );
        }


        case "update_session_state": {

            const industry =
                await getActiveIndustry();

            return await updateAgentSessionState(
                industry,
                args.action,
                args.payload
            );
        }


        // ==================================
        // UNKNOWN TOOL
        // ==================================

        default:

            throw new Error(
                `Unknown BSG agent tool: ${toolName}`
            );

    }

}


function compactFIRForAgent(result) {
    if (
        result === null ||
        result === undefined
    ) {
        return result;
    }

    const REMOVE_KEYS = new Set([
        "values",
        "sourceRow",
        "pageCode"
    ]);

    function compact(value) {
        if (Array.isArray(value)) {
            return value.map(compact);
        }

        if (
            value !== null &&
            typeof value === "object"
        ) {
            const output = {};

            for (
                const [key, childValue]
                of Object.entries(value)
            ) {
                if (REMOVE_KEYS.has(key)) {
                    continue;
                }

                output[key] = compact(childValue);
            }

            return output;
        }

        return value;
    }

    return compact(result);
}


function projectFIRCompaniesForAgent(
    result,
    companies
) {
    if (
        !Array.isArray(companies) ||
        companies.length === 0
    ) {
        return result;
    }

    const selectedCompanies =
        new Set(
            companies.map(company =>
                String(company).toUpperCase()
            )
        );

    function project(value) {
        if (Array.isArray(value)) {
            return value.map(project);
        }

        if (
            value !== null &&
            typeof value === "object"
        ) {
            const output = {};

            for (
                const [key, childValue]
                of Object.entries(value)
            ) {
                if (
                    key === "companyValues" &&
                    childValue !== null &&
                    typeof childValue === "object"
                ) {
                    output[key] =
                        Object.fromEntries(
                            Object.entries(
                                childValue
                            ).filter(
                                ([company]) =>
                                    selectedCompanies.has(
                                        company
                                    )
                            )
                        );

                    continue;
                }

                output[key] =
                    project(childValue);
            }

            return output;
        }

        return value;
    }

    return project(result);
}


function compactCompanyHistoryForAgent(result) {
    if (
        result === null ||
        result === undefined
    ) {
        return result;
    }


    const REMOVE_KEYS = new Set([
        "sourceRow",
        "values",
        "pageCode"
    ]);


    function compact(value) {
        if (Array.isArray(value)) {
            return value
                .map(compact)
                .filter(item =>
                    item !== null &&
                    item !== undefined
                );
        }

        if (
            value !== null &&
            typeof value === "object"
        ) {
            const output = {};

            for (
                const [key, childValue]
                of Object.entries(value)
            ) {
                if (REMOVE_KEYS.has(key)) {
                    continue;
                }

                if (
                    childValue === null ||
                    childValue === undefined
                ) {
                    continue;
                }

                output[key] =
                    compact(childValue);
            }

            return output;
        }

        return value;
    }


    const compacted =
        compact(result);


    for (
        const yearData
        of Object.values(
            compacted.years ?? {}
        )
    ) {
        const sections =
            yearData
                ?.companyOperatingReport
                ?.sections;

        if (
            !sections ||
            typeof sections !== "object"
        ) {
            continue;
        }


        for (
            const [section, data]
            of Object.entries(sections)
        ) {
            sections[section] =
                compactCORForAgent(
                    section,
                    data
                );
        }
    }


    return compacted;
}


function compactCORForAgent(
    section,
    result
) {
    if (
        result === null ||
        result === undefined
    ) {
        return result;
    }

    function compact(value) {
        if (Array.isArray(value)) {
            return value.map(compact);
        }

        if (
            value !== null &&
            typeof value === "object"
        ) {
            const output = {};

            for (
                const [key, childValue]
                of Object.entries(value)
            ) {
                if (
                    key === "sourceRow" ||
                    key === "pageCode"
                ) {
                    continue;
                }

                output[key] =
                    compact(childValue);
            }

            return output;
        }

        return value;
    }


    const compacted =
        compact(result);


    if (
        section ===
        "production_workforce" &&
        compacted &&
        typeof compacted === "object"
    ) {
        delete compacted.rows;

        if (
            compacted.data &&
            typeof compacted.data === "object"
        ) {
            delete compacted.data.rows;
        }
    }


    return compacted;
}


function compactAvailableDataForAgent(result) {
    if (
        !result ||
        typeof result !== "object"
    ) {
        return result;
    }

    const output = {
        industries: {}
    };

    for (
        const [industryKey, industryData]
        of Object.entries(
            result.industries ?? {}
        )
    ) {
        const liveYears =
            industryData.liveYears ?? {};

        const historicalYears =
            industryData.liveHistoricalYears ?? [];

        const schemas =
            historicalYears.map(year => {
                const data =
                    liveYears[year] ?? {};

                return {
                    firPages:
                        data.firPages ?? [],

                    cirRegions:
                        data.cirRegions ?? [],

                    corSections:
                        Object.fromEntries(
                            Object.entries(
                                data.corSections ?? {}
                            ).map(
                                ([section, info]) => [
                                    section,
                                    info?.regions ?? []
                                ]
                            )
                        )
                };
            });

        const sharedHistoricalSchema =
            schemas.length > 0 &&
            schemas.every(
                schema =>
                    JSON.stringify(schema) ===
                    JSON.stringify(schemas[0])
            );

        const compactedIndustry = {
            industry:
                industryData.industry,

            phase:
                industryData.phase,

            currentYear:
                industryData.currentYear,

            userCompany:
                industryData.userCompany,

            startingData: {
                available:
                    Boolean(
                        industryData
                            .startingData
                            ?.available
                    ),

                year:
                    industryData
                        .startingData
                        ?.year ?? null
            },

            liveHistoricalYears:
                historicalYears,

            currentRound: {
                available:
                    Boolean(
                        industryData
                            .currentRound
                            ?.available
                    ),

                year:
                    industryData
                        .currentRound
                        ?.year ?? null,

                pages:
                    industryData
                        .currentRound
                        ?.pages ?? []
            },

            practiceArchive: {
                available:
                    Boolean(
                        industryData
                            .practiceArchive
                            ?.available
                    ),

                years:
                    industryData
                        .practiceArchive
                        ?.years ?? [],

                access:
                    industryData
                        .practiceArchive
                        ?.access ?? null
            }
        };

        if (sharedHistoricalSchema) {
            compactedIndustry.historicalSchema =
                schemas[0];
        } else {
            compactedIndustry.liveYears =
                Object.fromEntries(
                    historicalYears.map(
                        (year, index) => [
                            year,
                            schemas[index]
                        ]
                    )
                );
        }

        output.industries[industryKey] =
            compactedIndustry;
    }

    return output;
}
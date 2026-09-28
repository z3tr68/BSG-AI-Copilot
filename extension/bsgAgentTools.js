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

        case "get_available_data":

            return await getAvailableData();

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
        // FIR
        // ==================================

        case "get_fir":

            return await getFIR(
                args.industry,
                args.year,
                args.page ?? null
            );


        // ==================================
        // CIR
        // ==================================

        case "get_cir":

            return await getCIR(
                args.industry,
                args.year,
                args.region ?? null,
                args.segment ?? null,
                args.company ?? null
            );


        // ==================================
        // COR
        // ==================================

        case "get_cor":

            return await getCOR(
                args.industry,
                args.year,
                args.section ?? null,
                args.region ?? null
            );


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


            return await getCompanyHistory(
                industry,
                args.company,
                options
            );

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


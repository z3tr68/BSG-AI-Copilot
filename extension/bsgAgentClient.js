const BSG_AGENT_API =
    "http://127.0.0.1:8000";


// ==========================================
// ASK BSG AGENT
// ==========================================

async function askBSGAgent(
    question
) {

    let response =
        await fetch(
            `${BSG_AGENT_API}/agent/start`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        question
                    })
            }
        );


    if (!response.ok) {

        throw new Error(
            `Agent request failed: ${response.status}`
        );

    }


    let agentResult =
        await response.json();


    // ======================================
    // AGENT LOOP
    // ======================================

    let iteration = 0;

    const MAX_ITERATIONS = 12;


    while (
        agentResult.status ===
        "tool_calls"
    ) {

        iteration++;


        if (
            iteration >
            MAX_ITERATIONS
        ) {

            throw new Error(
                "Agent exceeded maximum tool iterations."
            );

        }


        console.log(
            `Agent tool iteration ${iteration}`,
            agentResult.tool_calls
        );


        const toolOutputs = [];


        // ==================================
        // EXECUTE REQUESTED TOOLS
        // ==================================

        for (
            const toolCall
            of agentResult.tool_calls
        ) {

            try {

                const result =
                    await executeBSGTool(
                        toolCall.name,
                        toolCall.arguments
                    );


                toolOutputs.push({

                    call_id:
                        toolCall.call_id,

                    output:
                        result

                });

            }

            catch (error) {

                console.error(
                    "BSG tool failed:",
                    toolCall.name,
                    error
                );


                toolOutputs.push({

                    call_id:
                        toolCall.call_id,

                    output: {
                        error:
                            error.message
                    }

                });

            }

        }


        // ==================================
        // SEND TOOL RESULTS BACK
        // ==================================

        response =
            await fetch(
                `${BSG_AGENT_API}/agent/continue`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            response_id:
                                agentResult
                                    .response_id,

                            tool_outputs:
                                toolOutputs

                        })
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Agent continuation failed: ${response.status}\n{errorText}`
            );

        }


        agentResult =
            await response.json();

        if (!agentResult) {

            throw new Error(
                "Backend returned null from /agent/continue."
            );

        }


        if (!agentResult.status) {

            console.error(
                "Invalid continuation response:",
                agentResult
            );

            throw new Error(
                "Continuation response is missing status."
            );

        }

    }


    // ======================================
    // FINAL ANSWER
    // ======================================

    if (
        agentResult.status !==
        "complete"
    ) {

        throw new Error(
            "Agent ended in an unexpected state."
        );

    }


    return agentResult.answer;
}
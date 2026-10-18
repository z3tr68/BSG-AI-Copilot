from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import (
    CORSMiddleware
)
from pydantic import BaseModel

from agent import (
    start_agent_turn,
    continue_agent_turn
)


app = FastAPI(
    title="BSG AI Copilot API"
)


# Development only.
#
# Later we can restrict this more tightly.

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "*"
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ]
)


class AgentStartRequest(
    BaseModel
):

    question: str
    strategy_context: str | None = None


class ToolOutput(
    BaseModel
):

    call_id: str

    output: Any


class AgentContinueRequest(
    BaseModel
):

    response_id: str

    tool_outputs: list[ToolOutput]


@app.get("/")
def root():

    return {
        "status": "ok",
        "service":
            "BSG AI Copilot"
    }


@app.post(
    "/agent/start"
)

def agent_start(
    request:
        AgentStartRequest
):

    return start_agent_turn(
        request.question,
        request.strategy_context
    )


@app.post(
    "/agent/continue"
)
def agent_continue(
    request:
        AgentContinueRequest
):

    outputs = [

        output.model_dump()

        for output
        in request.tool_outputs

    ]


    return continue_agent_turn(

        request.response_id,

        outputs
    )
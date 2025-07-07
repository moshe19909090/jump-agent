import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { SendGmailTool } from "./tools/sendGmailTool";
import { ScheduleMeetingTool } from "./tools/scheduleMeetingTool";
import { CreateHubspotNoteTool } from "./tools/createHubspotNoteTool";
import { CreateHubspotContactTool } from "./tools/createHubspotContactTool";
import { SearchHubspotContactTool } from "./tools/searchHubspotContactTool";
import { SaveInstructionTool } from "./tools/SaveInstructionTool";

export async function getAgentExecutor() {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
  });

  const tools = [
    new SendGmailTool(),
    new ScheduleMeetingTool(),
    new CreateHubspotNoteTool(),
    new CreateHubspotContactTool(),
    new SearchHubspotContactTool(),
    new SaveInstructionTool(),
  ];

  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "openai-functions",
    verbose: true,
  });

  return executor;
}

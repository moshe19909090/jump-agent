import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { SendGmailTool } from "./tools/sendGmailTool";
import { ScheduleMeetingTool } from "./tools/scheduleMeetingTool";

export async function getAgentExecutor() {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.3,
  });

  const tools = [new SendGmailTool(), new ScheduleMeetingTool()];

  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "openai-functions",
    verbose: true,
  });

  return executor;
}

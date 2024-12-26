require("dotenv").config();
const {OpenAI} = require("openai");

class OpenAIManager {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.functions = [
      {
        name: "submitStory",
        description: "Submit a news story provided by the user.",
        parameters: {
          type: "object",
          properties: {
            contactInfo: {
              type: "string",
              description: "User contact information",
            },
            storyContent: {
              type: "string",
              description: "Content of the news story",
            },
          },
          required: ["storyContent"],
        },
      },
    ];
  }

  async processMessage(sessionData) {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: sessionData.conversationHistory,
        functions: this.functions,
      });

      const message = response.choices[0].message;

      if (message.function_call) {
        // Handle function call
        const functionResult = await this.handleFunctionCall(message.function_call);

        // Get final response with function result
        const finalResponse = await this.client.chat.completions.create({
          model: "gpt-4",
          messages: [
            ...sessionData.conversationHistory,
            message,
            {
              role: "function",
              name: message.function_call.name,
              content: JSON.stringify(functionResult),
            },
          ],
        });

        return finalResponse.choices[0].message.content;
      }

      return message.content;
    } catch (error) {
      console.error("OpenAI Error:", error);
      throw error;
    }
  }

  async handleFunctionCall(functionCall) {
    const {name, arguments: args} = functionCall;
    const parsedArgs = JSON.parse(args);

    switch (name) {
      case "submitStory":
        return await this.submitStory(parsedArgs);
      case "submitTip":
        return await this.submitTip(parsedArgs);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  async submitStory({contactInfo, storyContent}) {
    // Placeholder - implement actual story submission logic
    return {
      success: true,
      message: "Story submitted successfully",
    };
  }

  async submitTip({tipDetails, location, anonymous}) {
    // Placeholder - implement actual tip submission logic
    return {
      success: true,
      message: "Tip received successfully",
    };
  }
}

module.exports = new OpenAIManager();

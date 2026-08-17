const path = require("path");
/**
 * Swagger/OpenAPI Configuration for ZER0 QA Orchestrator
 */
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ZER0 QA Orchestrator API",
      version: "2.0.0",
      description: `
## Enterprise QA Orchestration Platform

ZER0 is an AI-powered QA orchestration platform that automates the entire testing lifecycle:

- **Web Analysis**: Intelligent website analysis and element detection
- **Requirements**: AI-generated BRD and requirements documentation  
- **Manual Testing**: Auto-generated manual test cases
- **Automation**: Playwright/Selenium script generation
- **Execution**: Automated test execution with reporting
- **Management**: Comprehensive test reports and dashboards

### Authentication
Use API keys for authentication. Include the key in the \`x-api-key\` header.

### Rate Limiting
- Standard tier: 100 requests/minute
- Enterprise tier: 1000 requests/minute
      `,
      contact: {
        name: "ZER0 Support",
        email: "support@zer0.io"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server"
      },
      {
        url: "https://api.zer0.io",
        description: "Production server"
      }
    ],
    tags: [
      { name: "Runs", description: "Test run management" },
      { name: "Analysis", description: "Website analysis endpoints" },
      { name: "API Keys", description: "API key management" },
      { name: "Locators", description: "Element locator management" },
      { name: "Health", description: "System health checks" }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API key for authentication"
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas: {
        Run: {
          type: "object",
          properties: {
            id: { type: "string", example: "1778589607382-20535" },
            status: { 
              type: "string", 
              enum: ["pending", "running", "completed", "failed"],
              example: "completed"
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            input: { $ref: "#/components/schemas/RunInput" },
            stages: { type: "object" },
            artifacts: { $ref: "#/components/schemas/Artifacts" }
          }
        },
        RunInput: {
          type: "object",
          required: ["ottUrl"],
          properties: {
            ottUrl: { 
              type: "string", 
              format: "uri",
              example: "https://www.example.com"
            },
            profile: { 
              type: "string",
              example: "retail_store"
            },
            executionMode: {
              type: "string",
              enum: ["default", "uploaded_tc_only"],
              example: "default"
            }
          }
        },
        Artifacts: {
          type: "object",
          properties: {
            webAnalysis: { type: "object" },
            requirements: { type: "object" },
            manualTestCases: { type: "object" },
            automationBundle: { type: "object" },
            executionReport: { type: "object" },
            managerReport: { type: "object" }
          }
        },
        WebAnalysis: {
          type: "object",
          properties: {
            metadata: {
              type: "object",
              properties: {
                websiteType: { type: "string", example: "Retail Store" },
                confidence: { type: "number", example: 0.95 }
              }
            },
            elements: { type: "array", items: { $ref: "#/components/schemas/Element" } },
            userFlows: { type: "array", items: { $ref: "#/components/schemas/UserFlow" } },
            testCases: { type: "array", items: { $ref: "#/components/schemas/TestCase" } }
          }
        },
        Element: {
          type: "object",
          properties: {
            category: { type: "string", example: "NAVIGATION" },
            type: { type: "string", example: "link" },
            text: { type: "string", example: "Home" },
            selector: { type: "string", example: "nav a.home-link" }
          }
        },
        UserFlow: {
          type: "object",
          properties: {
            name: { type: "string", example: "Site Navigation" },
            priority: { type: "string", enum: ["Critical", "High", "Medium", "Low"] },
            steps: { type: "array", items: { type: "string" } }
          }
        },
        TestCase: {
          type: "object",
          properties: {
            id: { type: "string", example: "TC-001" },
            module: { type: "string", example: "Navigation" },
            scenario: { type: "string", example: "Verify main menu navigation" },
            priority: { type: "string", example: "Critical" },
            type: { type: "string", example: "Functional" },
            expectedResult: { type: "string" }
          }
        },
        ApiKey: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            provider: { type: "string", enum: ["OPENAI", "ANTHROPIC", "GOOGLE", "AZURE", "CUSTOM"] },
            maskedKey: { type: "string", example: "sk-••••••••1234" },
            createdAt: { type: "string", format: "date-time" },
            lastUsed: { type: "string", format: "date-time" },
            usageCount: { type: "integer" }
          }
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            statusCode: { type: "integer" }
          }
        }
      },
      responses: {
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" }
            }
          }
        },
        Unauthorized: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" }
            }
          }
        },
        RateLimited: {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" }
            }
          }
        }
      }
    }
  },
  apis: [path.join(process.cwd(), "apps/api/server.js")]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { createSubApp } from "../shared/app-factory.js";
import { requireAuth } from "../infrastructure/auth.middleware.js";
import { ErrorSchema } from "../shared/schemas.js";
import {
  DemoNotFoundError,
  AgentNotFoundError,
  AgentAlreadyAssignedError,
  AgentNotAssignedError,
} from "./demo.service.js";

// Schema definitions
const DemoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  activeAgent: z.string().nullable(),
  createdAt: z.string(),
  agentNames: z.array(z.string()),
});

const CreateDemoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

const UpdateDemoSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

const AssignAgentSchema = z.object({
  agent_name: z.string(),
});

const SetActiveAgentSchema = z.object({
  agent_name: z.string(),
});

// Route definitions
const createDemo = createRoute({
  method: "post",
  path: "/",
  tags: ["Demos"],
  summary: "Create a demo",
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: CreateDemoSchema } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ id: z.string() }) } } },
  },
});

const listDemos = createRoute({
  method: "get",
  path: "/",
  tags: ["Demos"],
  summary: "List demos (admin)",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Demo list", content: { "application/json": { schema: z.object({ demos: z.array(DemoSchema) }) } } },
  },
});

const getDemo = createRoute({
  method: "get",
  path: "/{demoId}",
  tags: ["Demos"],
  summary: "Get a demo",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ demoId: z.string() }) },
  responses: {
    200: { description: "Demo details", content: { "application/json": { schema: DemoSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const updateDemo = createRoute({
  method: "put",
  path: "/{demoId}",
  tags: ["Demos"],
  summary: "Update a demo",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ demoId: z.string() }),
    body: { content: { "application/json": { schema: UpdateDemoSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const deleteDemo = createRoute({
  method: "delete",
  path: "/{demoId}",
  tags: ["Demos"],
  summary: "Delete a demo",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ demoId: z.string() }) },
  responses: {
    200: { description: "Deleted", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const assignAgent = createRoute({
  method: "post",
  path: "/{demoId}/agents",
  tags: ["Demos"],
  summary: "Assign agent to demo",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ demoId: z.string() }),
    body: { content: { "application/json": { schema: AssignAgentSchema } } },
  },
  responses: {
    200: { description: "Assigned", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
    400: { description: "Invalid", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const unassignAgent = createRoute({
  method: "delete",
  path: "/{demoId}/agents/{agentName}",
  tags: ["Demos"],
  summary: "Unassign agent from demo",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ demoId: z.string(), agentName: z.string() }) },
  responses: {
    200: { description: "Unassigned", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const setActiveAgent = createRoute({
  method: "put",
  path: "/{demoId}/active-agent",
  tags: ["Demos"],
  summary: "Set active agent for demo",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ demoId: z.string() }),
    body: { content: { "application/json": { schema: SetActiveAgentSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: z.object({ active_agent: z.string() }) } } },
    400: { description: "Invalid", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

const getActiveAgent = createRoute({
  method: "get",
  path: "/{demoId}/active-agent",
  tags: ["Demos"],
  summary: "Get active agent for demo",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ demoId: z.string() }) },
  responses: {
    200: { description: "Active agent", content: { "application/json": { schema: z.object({ active_agent: z.string().nullable() }) } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

// Helper for error mapping
function handleDemoError(err: unknown): never {
  if (err instanceof DemoNotFoundError) {
    throw new HTTPException(404, {
      res: Response.json({ error: { type: "not_found", message: err.message } }, { status: 404 }),
    });
  }
  if (err instanceof AgentNotFoundError || err instanceof AgentAlreadyAssignedError || err instanceof AgentNotAssignedError) {
    throw new HTTPException(400, {
      res: Response.json({ error: { type: "invalid_request", message: err.message } }, { status: 400 }),
    });
  }
  throw err;
}

// App setup
const app = createSubApp();
app.use(requireAuth("admin"));

app.openapi(createDemo, async (c) => {
  const { id, name, description } = c.req.valid("json");
  const demoService = c.get("demoService");
  await demoService.createDemo(id, name, description);
  return c.json({ id }, 201);
});

app.openapi(listDemos, async (c) => {
  const demoService = c.get("demoService");
  const demos = await demoService.listDemos();
  const result = await Promise.all(
    demos.map(async (d) => ({
      ...d,
      agentNames: await demoService.getAgentNames(d.id),
    })),
  );
  return c.json({ demos: result }, 200);
});

app.openapi(getDemo, async (c) => {
  const { demoId } = c.req.valid("param");
  const demoService = c.get("demoService");
  try {
    const demo = await demoService.getDemo(demoId);
    const agentNames = await demoService.getAgentNames(demoId);
    return c.json({ ...demo, agentNames }, 200);
  } catch (err) {
    handleDemoError(err);
  }
});

app.openapi(updateDemo, async (c) => {
  const { demoId } = c.req.valid("param");
  const fields = c.req.valid("json");
  const demoService = c.get("demoService");
  try {
    await demoService.updateDemo(demoId, fields);
    return c.json({ ok: true }, 200);
  } catch (err) {
    handleDemoError(err);
  }
});

app.openapi(deleteDemo, async (c) => {
  const { demoId } = c.req.valid("param");
  const demoService = c.get("demoService");
  try {
    await demoService.deleteDemo(demoId);
    return c.json({ ok: true }, 200);
  } catch (err) {
    handleDemoError(err);
  }
});

app.openapi(assignAgent, async (c) => {
  const { demoId } = c.req.valid("param");
  const { agent_name } = c.req.valid("json");
  const demoService = c.get("demoService");
  try {
    await demoService.assignAgent(demoId, agent_name);
    return c.json({ ok: true }, 200);
  } catch (err) {
    handleDemoError(err);
  }
});

app.openapi(unassignAgent, async (c) => {
  const { demoId, agentName } = c.req.valid("param");
  const demoService = c.get("demoService");
  try {
    await demoService.unassignAgent(demoId, agentName);
    return c.json({ ok: true }, 200);
  } catch (err) {
    handleDemoError(err);
  }
});

app.openapi(setActiveAgent, async (c) => {
  const { demoId } = c.req.valid("param");
  const { agent_name } = c.req.valid("json");
  const demoService = c.get("demoService");
  try {
    await demoService.setActiveAgent(demoId, agent_name);
    return c.json({ active_agent: agent_name }, 200);
  } catch (err) {
    handleDemoError(err);
  }
});

app.openapi(getActiveAgent, async (c) => {
  const { demoId } = c.req.valid("param");
  const demoService = c.get("demoService");
  try {
    const activeAgent = await demoService.getActiveAgent(demoId);
    return c.json({ active_agent: activeAgent }, 200);
  } catch (err) {
    handleDemoError(err);
  }
});

export { app as adminDemoRoutes };

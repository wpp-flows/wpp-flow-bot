import { prisma } from "@/infrastructure/database/client";
import { Prisma } from "@/generated/prisma/client";
import type {
    Flow,
    FlowRepository,
    FlowStep,
    FlowStepType,
    FlowWithSteps,
    NewStepInput,
} from "../flow-repo";

const serializeMetadata = (
    metadata: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
    if (metadata === undefined) return undefined;
    if (metadata === null) return Prisma.JsonNull;
    return metadata as Prisma.InputJsonValue;
};

const toStep = (row: any): FlowStep => ({
    id: row.id,
    flowId: row.flowId,
    type: row.type as FlowStepType,
    content: row.content,
    order: row.order,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const toFlow = (row: any): Flow => ({
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    isActive: row.isActive,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const toFlowWithSteps = (row: any): FlowWithSteps => ({
    ...toFlow(row),
    steps: (row.steps ?? []).map(toStep),
});

export class PrismaFlowRepository implements FlowRepository {
    async listByOrg(organizationId: string): Promise<Flow[]> {
        const rows = await prisma.flow.findMany({
            where: { organizationId },
            orderBy: [{ name: "asc" }, { version: "desc" }],
        });
        return rows.map(toFlow);
    }

    async findActive(organizationId: string): Promise<FlowWithSteps | null> {
        const row = await prisma.flow.findFirst({
            where: { organizationId, isActive: true },
            include: { steps: { orderBy: { order: "asc" } } },
        });
        return row ? toFlowWithSteps(row) : null;
    }

    async findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<FlowWithSteps | null> {
        const row = await prisma.flow.findFirst({
            where: { id, organizationId },
            include: { steps: { orderBy: { order: "asc" } } },
        });
        return row ? toFlowWithSteps(row) : null;
    }

    async findLatestVersion(
        organizationId: string,
        name: string
    ): Promise<Flow | null> {
        const row = await prisma.flow.findFirst({
            where: { organizationId, name },
            orderBy: { version: "desc" },
        });
        return row ? toFlow(row) : null;
    }

    async create(input: {
        organizationId: string;
        name: string;
        version: number;
        isActive: boolean;
        steps: NewStepInput[];
    }): Promise<FlowWithSteps> {
        return prisma.$transaction(async (tx) => {
            if (input.isActive) {
                await tx.flow.updateMany({
                    where: { organizationId: input.organizationId, isActive: true },
                    data: { isActive: false },
                });
            }
            const created = await tx.flow.create({
                data: {
                    organizationId: input.organizationId,
                    name: input.name,
                    version: input.version,
                    isActive: input.isActive,
                    steps: {
                        create: input.steps.map((s) => ({
                            type: s.type,
                            content: s.content,
                            order: s.order,
                            ...(s.metadata === undefined
                                ? {}
                                : { metadata: serializeMetadata(s.metadata) }),
                        })),
                    },
                },
                include: { steps: { orderBy: { order: "asc" } } },
            });
            return toFlowWithSteps(created);
        });
    }

    async updateName(id: string, name: string): Promise<Flow> {
        const row = await prisma.flow.update({
            where: { id },
            data: { name },
        });
        return toFlow(row);
    }

    async delete(id: string): Promise<void> {
        await prisma.flow.delete({ where: { id } });
    }

    async activate(
        organizationId: string,
        id: string
    ): Promise<FlowWithSteps> {
        return prisma.$transaction(async (tx) => {
            await tx.flow.updateMany({
                where: { organizationId, isActive: true, NOT: { id } },
                data: { isActive: false },
            });
            const updated = await tx.flow.update({
                where: { id },
                data: { isActive: true },
                include: { steps: { orderBy: { order: "asc" } } },
            });
            return toFlowWithSteps(updated);
        });
    }

    async replaceSteps(
        flowId: string,
        steps: NewStepInput[]
    ): Promise<FlowWithSteps> {
        return prisma.$transaction(async (tx) => {
            await tx.flowStep.deleteMany({ where: { flowId } });
            await tx.flowStep.createMany({
                data: steps.map((s) => ({
                    flowId,
                    type: s.type,
                    content: s.content,
                    order: s.order ?? 0,
                    ...(s.metadata === undefined
                        ? {}
                        : { metadata: serializeMetadata(s.metadata) }),
                })),
            });
            const updated = await tx.flow.update({
                where: { id: flowId },
                data: { updatedAt: new Date() },
                include: { steps: { orderBy: { order: "asc" } } },
            });
            return toFlowWithSteps(updated);
        });
    }

    async reorderSteps(
        flowId: string,
        orderedIds: string[]
    ): Promise<FlowWithSteps> {
        return prisma.$transaction(async (tx) => {
            for (let i = 0; i < orderedIds.length; i++) {
                await tx.flowStep.update({
                    where: { id: orderedIds[i] },
                    data: { order: i },
                });
            }
            const updated = await tx.flow.findUniqueOrThrow({
                where: { id: flowId },
                include: { steps: { orderBy: { order: "asc" } } },
            });
            return toFlowWithSteps(updated);
        });
    }
}

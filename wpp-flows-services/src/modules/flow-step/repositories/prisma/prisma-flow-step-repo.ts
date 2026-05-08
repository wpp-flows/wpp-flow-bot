import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/client";
import type { FlowStep, FlowStepType, NewStepInput } from "@/modules/flow/repositories/flow-repo";
import type { FlowStepRepository, UpdateFlowStepInput } from "../flow-step-repo";

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

export class PrismaFlowStepRepository implements FlowStepRepository {
    async findByIdInOrg(
        organizationId: string,
        id: string
    ): Promise<FlowStep | null> {
        const row = await prisma.flowStep.findFirst({
            where: {
                id,
                flow: { organizationId },
            },
        });
        return row ? toStep(row) : null;
    }

    async create(flowId: string, data: NewStepInput): Promise<FlowStep> {
        return prisma.$transaction(async (tx) => {
            const row = await tx.flowStep.create({
                data: {
                    flowId,
                    type: data.type,
                    content: data.content,
                    order: data.order ?? 0,
                    ...(data.metadata === undefined
                        ? {}
                        : { metadata: serializeMetadata(data.metadata) }),
                },
            });
            await tx.flow.update({
                where: { id: flowId },
                data: { updatedAt: new Date() },
            });
            return toStep(row);
        });
    }

    async update(id: string, data: UpdateFlowStepInput): Promise<FlowStep> {
        return prisma.$transaction(async (tx) => {
            const row = await tx.flowStep.update({
                where: { id },
                data: {
                    type: data.type,
                    content: data.content,
                    order: data.order,
                    ...(data.metadata === undefined
                        ? {}
                        : { metadata: serializeMetadata(data.metadata) }),
                },
            });
            await tx.flow.update({
                where: { id: row.flowId },
                data: { updatedAt: new Date() },
            });
            return toStep(row);
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const row = await tx.flowStep.delete({ where: { id } });
            await tx.flow.update({
                where: { id: row.flowId },
                data: { updatedAt: new Date() },
            });
        });
    }

    countByFlow(flowId: string): Promise<number> {
        return prisma.flowStep.count({ where: { flowId } });
    }
}

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "reportDate" DATE NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "canceledCount" INTEGER NOT NULL DEFAULT 0,
    "cashCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidRevenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "orders" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_organizationId_idx" ON "report"("organizationId");

-- CreateIndex
CREATE INDEX "report_organizationId_reportDate_idx" ON "report"("organizationId", "reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "report_organizationId_serviceType_reportDate_key" ON "report"("organizationId", "serviceType", "reportDate");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

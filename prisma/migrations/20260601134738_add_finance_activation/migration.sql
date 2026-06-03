-- CreateEnum
CREATE TYPE "ActivationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "status" "ActivationStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivationForm" (
    "id" TEXT NOT NULL,
    "activationId" TEXT NOT NULL,
    "formNumber" INTEGER NOT NULL,
    "filled" BOOLEAN NOT NULL DEFAULT false,
    "filledAt" TIMESTAMP(3),
    "filledById" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activation_createdById_idx" ON "Activation"("createdById");

-- CreateIndex
CREATE INDEX "Activation_status_idx" ON "Activation"("status");

-- CreateIndex
CREATE INDEX "Activation_createdAt_idx" ON "Activation"("createdAt");

-- CreateIndex
CREATE INDEX "ActivationForm_activationId_idx" ON "ActivationForm"("activationId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivationForm_activationId_formNumber_key" ON "ActivationForm"("activationId", "formNumber");

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationForm" ADD CONSTRAINT "ActivationForm_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "Activation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivationForm" ADD CONSTRAINT "ActivationForm_filledById_fkey" FOREIGN KEY ("filledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

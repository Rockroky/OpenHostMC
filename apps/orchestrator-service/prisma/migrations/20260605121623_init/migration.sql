-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "McType" AS ENUM ('VANILLA', 'PAPER', 'SPIGOT', 'FORGE', 'FABRIC', 'QUILT', 'BEDROCK');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('CREATED', 'STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'ERROR', 'CRASHED', 'QUEUED');

-- CreateEnum
CREATE TYPE "SettingCategory" AS ENUM ('world', 'gameplay', 'performance', 'network', 'security', 'advanced');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_servers" INTEGER NOT NULL,
    "ram_mb" INTEGER NOT NULL,
    "cpu_cores" DOUBLE PRECISION NOT NULL,
    "storage_gb" INTEGER NOT NULL,
    "max_players" INTEGER NOT NULL,
    "daily_uptime_hours" INTEGER NOT NULL,
    "backup_max_stored" INTEGER NOT NULL,
    "backup_frequency_hours" INTEGER NOT NULL,
    "queue_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "plan_id" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortPool" (
    "port" INTEGER NOT NULL,
    "server_id" TEXT,
    "allocated_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),

    CONSTRAINT "PortPool_pkey" PRIMARY KEY ("port")
);

-- CreateTable
CREATE TABLE "McServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "mc_type" "McType" NOT NULL,
    "mc_version" TEXT NOT NULL,
    "status" "ServerStatus" NOT NULL DEFAULT 'CREATED',
    "port" INTEGER,
    "rcon_port" INTEGER,
    "rcon_password" TEXT,
    "container_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "motd" TEXT DEFAULT 'A Minecraft Server',
    "icon_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "queue_position" INTEGER,
    "last_started_at" TIMESTAMP(3),
    "last_stopped_at" TIMESTAMP(3),
    "today_uptime_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_uptime_seconds" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" "SettingCategory" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "server_id" TEXT NOT NULL,

    CONSTRAINT "ServerSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "PortPool_server_id_key" ON "PortPool"("server_id");

-- CreateIndex
CREATE INDEX "PortPool_port_idx" ON "PortPool"("port");

-- CreateIndex
CREATE UNIQUE INDEX "McServer_subdomain_key" ON "McServer"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "McServer_port_key" ON "McServer"("port");

-- CreateIndex
CREATE INDEX "McServer_status_idx" ON "McServer"("status");

-- CreateIndex
CREATE INDEX "McServer_subdomain_idx" ON "McServer"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "McServer_owner_id_name_key" ON "McServer"("owner_id", "name");

-- CreateIndex
CREATE INDEX "ServerSetting_server_id_category_idx" ON "ServerSetting"("server_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ServerSetting_server_id_key_key" ON "ServerSetting"("server_id", "key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortPool" ADD CONSTRAINT "PortPool_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "McServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McServer" ADD CONSTRAINT "McServer_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McServer" ADD CONSTRAINT "McServer_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerSetting" ADD CONSTRAINT "ServerSetting_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "McServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

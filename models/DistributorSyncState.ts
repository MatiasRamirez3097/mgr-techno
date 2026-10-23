import { Schema, model, models } from "mongoose";

// Un documento por distribuidor (_id = "invid"): token de acceso, lock y resultado
// de la última sincronización, y el cupo de requests informado por la API.
const DistributorSyncStateSchema = new Schema(
    {
        _id: { type: String, required: true },

        accessToken: { type: String, default: null },
        tokenExpiresAt: { type: Date, default: null },

        // Evita dos sincronizaciones en paralelo entre instancias serverless
        lockedUntil: { type: Date, default: null },

        lastSyncStartedAt: { type: Date, default: null },
        lastSyncFinishedAt: { type: Date, default: null },
        lastSuccessfulSyncAt: { type: Date, default: null },
        lastSyncStatus: {
            type: String,
            enum: ["ok", "partial", "error", "skipped", null],
            default: null,
        },
        lastSyncError: { type: String, default: null },
        lastSyncItems: { type: Number, default: 0 },
        lastSyncRequests: { type: Number, default: 0 },

        rateLimitRemaining: { type: Number, default: null },
        rateLimitResetAt: { type: Date, default: null },
    },
    { timestamps: true },
);

export const DistributorSyncStateModel =
    models.DistributorSyncState ||
    model(
        "DistributorSyncState",
        DistributorSyncStateSchema,
        "distributor_sync_states",
    );

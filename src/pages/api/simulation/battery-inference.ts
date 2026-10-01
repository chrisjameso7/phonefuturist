import type {
  APIRoute,
} from 'astro';

import {
  z,
} from 'zod';

import {
  createBatteryInferenceService,
} from '../../../lib/simulation/inference-service';

import {
  createCloudflareBatteryInferenceProvider,
} from '../../../lib/simulation/providers/cloudflare-battery-inference-provider';

import {
  batteryInferenceSettings,
} from '../../../lib/simulation/inference-settings';

import {
  createBatteryEvidenceSnapshotFromDevice,
} from '../../../lib/simulation/evidence-snapshot';

const MAX_REQUEST_BYTES =
  32 * 1024;

const percentageSchema =
  z
    .number()
    .min(0)
    .max(100);

const workloadSchema =
  z
    .object({
      webSocialPercent:
        percentageSchema.optional(),

      videoPercent:
        percentageSchema.optional(),

      gamingPercent:
        percentageSchema.optional(),

      cameraPercent:
        percentageSchema.optional(),

      idlePercent:
        percentageSchema.optional(),
    })
    .strict()
    .refine(
      (workload) => {
        const values = [
          workload.webSocialPercent,
          workload.videoPercent,
          workload.gamingPercent,
          workload.cameraPercent,
          workload.idlePercent,
        ].filter(
          (value):
            value is number =>
              value !== undefined,
        );

        if (values.length === 0) {
          return false;
        }

        const total =
          values.reduce(
            (sum, value) =>
              sum + value,
            0,
          );

        return (
          Math.abs(
            total - 100,
          ) < 0.000001
        );
      },
      {
        message:
          'Custom workload percentages must total 100.',
      },
    );

const scenarioSchema =
  z
    .object({
      deviceName:
        z
          .string()
          .trim()
          .min(1)
          .max(200)
          .optional(),

      usageProfile:
        z.enum([
          'light',
          'typical',
          'heavy',
          'custom',
        ]),

      brightness:
        z
          .object({
            value:
              z
                .number()
                .positive(),

            unit:
              z.literal(
                'nits',
              ),
          })
          .strict()
          .optional(),

      network:
        z
          .enum([
            'wifi',
            'mixed',
            'cellular',
          ])
          .optional(),

      ambientTemperatureC:
        z
          .number()
          .min(-50)
          .max(100)
          .optional(),

      workload:
        workloadSchema.optional(),
    })
    .strict()
    .superRefine(
      (
        scenario,
        context,
      ) => {
        if (
          scenario.usageProfile ===
            'custom' &&
          !scenario.workload
        ) {
          context.addIssue({
            code:
              'custom',
            message:
              'Custom usage profile requires a workload distribution.',
            path: [
              'workload',
            ],
          });
        }

        if (
          scenario.usageProfile !==
            'custom' &&
          scenario.workload
        ) {
          context.addIssue({
            code:
              'custom',
            message:
              'Workload distribution is only allowed for the custom usage profile.',
            path: [
              'workload',
            ],
          });
        }
      },
    );

const deviceSchema =
  z
    .object({
      name:
        z
          .string()
          .trim()
          .min(1)
          .max(200)
          .optional(),

      energyWh:
        z
          .number()
          .positive()
          .optional(),

      displayAreaCm2:
        z
          .number()
          .positive()
          .optional(),
    })
    .strict();

const requestSchema =
  z
    .object({
      scenario:
        scenarioSchema,

      device:
        deviceSchema,
    })
    .strict();

function json(
  data: unknown,
  status = 200,
): Response {
  return Response.json(
    data,
    {
      status,

      headers: {
        'Cache-Control':
          'private, no-store',
      },
    },
  );
}

async function boundedJson(
  request: Request,
): Promise<unknown> {
  const contentType =
    request.headers.get(
      'content-type',
    ) ?? '';

  if (
    !contentType
      .toLowerCase()
      .startsWith(
        'application/json',
      )
  ) {
    throw new Error(
      'content_type',
    );
  }

  const declaredLength =
    request.headers.get(
      'content-length',
    );

  if (declaredLength) {
    const bytes =
      Number(
        declaredLength,
      );

    if (
      !Number.isSafeInteger(
        bytes,
      ) ||
      bytes < 0 ||
      bytes >
        MAX_REQUEST_BYTES
    ) {
      throw new Error(
        'request_size',
      );
    }
  }

  const text =
    await request.text();

  const actualBytes =
    new TextEncoder()
      .encode(text)
      .byteLength;

  if (
    actualBytes === 0 ||
    actualBytes >
      MAX_REQUEST_BYTES
  ) {
    throw new Error(
      'request_size',
    );
  }

  try {
    return JSON.parse(
      text,
    );
  } catch {
    throw new Error(
      'invalid_json',
    );
  }
}

export const POST:
  APIRoute = async ({
    request,
    locals,
  }) => {
    if (!locals.user) {
      return json(
        {
          error:
            'Sign in to use Interactive Leaks simulation.',
        },
        401,
      );
    }

    if (
      !locals.access ||
      !locals.access.active
    ) {
      return json(
        {
          error:
            'Your account does not currently have access to Interactive Leaks simulation.',
        },
        403,
      );
    }

    let rawInput: unknown;

    try {
      rawInput =
        await boundedJson(
          request,
        );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : '';

      if (
        code ===
        'content_type'
      ) {
        return json(
          {
            error:
              'Content-Type must be application/json.',
          },
          415,
        );
      }

      if (
        code ===
        'request_size'
      ) {
        return json(
          {
            error:
              'Battery inference request is empty or too large.',
          },
          413,
        );
      }

      return json(
        {
          error:
            'Invalid JSON request.',
        },
        400,
      );
    }

    const parsed =
      requestSchema.safeParse(
        rawInput,
      );

    if (!parsed.success) {
      return json(
        {
          error:
            'Invalid battery inference request.',

          issues:
            parsed.error.issues.map(
              (issue) => ({
                path:
                  issue.path.join(
                    '.',
                  ),

                message:
                  issue.message,
              }),
            ),
        },
        400,
      );
    }

    const settings =
      batteryInferenceSettings();

    if (!settings) {
      return json(
        {
          error:
            'Battery inference is not configured.',
        },
        503,
      );
    }

    /*
     * The client does not provide evidence.
     *
     * Evidence is frozen here from
     * PhoneFuturist's server-owned
     * calibration/reference dataset.
     */
    const evidence =
      createBatteryEvidenceSnapshotFromDevice(
        parsed.data.device,
      );

    const provider =
      createCloudflareBatteryInferenceProvider(
        settings,
      );

    const service =
      createBatteryInferenceService(
        {
          provider,
        },
      );

    const result =
      await service.infer({
        scenario:
          parsed.data.scenario,

        evidence,
      });

    switch (
      result.status
    ) {
      case 'ready':
        return json({
          status:
            result.status,

          envelope:
            result.envelope,
        });

      case 'insufficient_evidence':
        return json({
          status:
            result.status,

          envelope:
            result.envelope,
        });

      case 'invalid_provider_output':
        return json(
          {
            error:
              'The inference model returned an invalid result.',

            status:
              result.status,

            issues:
              result.issues,
          },
          502,
        );

      case 'provider_error':
        return json(
          {
            error:
              'The inference provider could not complete the request.',

            status:
              result.status,

            message:
              result.message,
          },
          502,
        );
    }
  };
import type { APIRoute } from 'astro';
import { serverClient } from '../../lib/supabase';
import {
  canResolvePredictionReality,
  validateRealitySnapshotForStorage,
} from '../../lib/simulation/prediction-history';
import {
  validatePredictionAgainstReality,
  type PredictionSnapshot,
} from '../../lib/simulation/modules/prediction-validation';

function json(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'content-type':
          'application/json',
        'cache-control':
          'no-store',
      },
    },
  );
}

async function staffClient(
  request: Request,
  cookies: Parameters<
    typeof serverClient
  >[0],
) {
  const supabase =
    serverClient(
      cookies,
      request,
    );

  if (!supabase) {
    return {
      ok: false as const,
      status: 503,
      error:
        'Prediction validation storage is not configured.',
    };
  }

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      error:
        'Sign in is required.',
    };
  }

  const { data, error } =
    await supabase.rpc(
      'foundation_access',
    );

  if (
    error ||
    !canResolvePredictionReality(
      data as Parameters<
        typeof canResolvePredictionReality
      >[0],
    )
  ) {
    return {
      ok: false as const,
      status: 403,
      error:
        'Editorial prediction-resolution access is required.',
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
  };
}

export const POST: APIRoute =
  async ({
    request,
    cookies,
  }) => {
    const staff =
      await staffClient(
        request,
        cookies,
      );

    if (!staff.ok) {
      return json(
        {
          ok: false,
          error:
            staff.error,
        },
        staff.status,
      );
    }

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return json(
        {
          ok: false,
          error:
            'Invalid JSON payload.',
        },
        400,
      );
    }

    const payload =
      (
        body &&
        typeof body ===
          'object' &&
        !Array.isArray(body)
      )
        ? (
            body as Record<
              string,
              unknown
            >
          ).reality
        : undefined;

    const validated =
      validateRealitySnapshotForStorage(
        payload,
      );

    if (!validated.ok) {
      return json(
        {
          ok: false,
          error:
            validated.error,
        },
        400,
      );
    }

    const reality =
      validated.value;

    const {
      data: predictionRow,
      error:
        predictionError,
    } =
      await staff.supabase
        .from(
          'simulation_predictions',
        )
        .select(
          'id,prediction_snapshot',
        )
        .eq(
          'id',
          reality.predictionId,
        )
        .maybeSingle();

    if (predictionError) {
      console.error(
        'Failed to load prediction for resolution',
        {
          code:
            predictionError.code,
          message:
            predictionError.message,
        },
      );

      return json(
        {
          ok: false,
          error:
            'Prediction could not be loaded.',
        },
        503,
      );
    }

    if (!predictionRow) {
      return json(
        {
          ok: false,
          error:
            'Prediction was not found.',
        },
        404,
      );
    }

    const prediction =
      predictionRow.prediction_snapshot as
        PredictionSnapshot;

    const validation =
      validatePredictionAgainstReality(
        prediction,
        reality,
      );

    if (
      validation.status ===
      'unresolved'
    ) {
      return json(
        {
          ok: false,
          error:
            validation.note,
          validation,
        },
        400,
      );
    }

    const { error } =
      await staff.supabase
        .from(
          'simulation_reality_snapshots',
        )
        .insert({
          id: reality.id,
          prediction_id:
            reality.predictionId,
          resolved_by:
            staff.user.id,
          reality_snapshot:
            reality,
        });

    if (error) {
      console.error(
        'Failed to save simulation reality snapshot',
        {
          code: error.code,
          message:
            error.message,
        },
      );

      return json(
        {
          ok: false,
          error:
            error.code ===
            '23505'
              ? 'This reality snapshot has already been saved.'
              : 'Reality snapshot could not be saved right now.',
        },
        error.code ===
          '23505'
          ? 409
          : 503,
      );
    }

    return json(
      {
        ok: true,
        realityId:
          reality.id,
        validation,
      },
      201,
    );
  };

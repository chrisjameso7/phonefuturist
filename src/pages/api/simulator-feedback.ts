import type { APIRoute } from 'astro';
import { serverClient } from '../../lib/supabase';
import {
  createBetaFeedbackReference,
  validateBetaFeedbackSubmission,
} from '../../lib/simulation/beta-feedback';

export const POST: APIRoute = async ({
  request,
  cookies,
}) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Invalid JSON payload.',
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }

  const validated =
    validateBetaFeedbackSubmission(body);

  if (!validated.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: validated.error,
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }

  const supabase = serverClient(cookies, request);

  if (!supabase) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'Feedback storage is not configured.',
      }),
      {
        status: 503,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { id, reference } =
    createBetaFeedbackReference();

  const feedback = validated.value;

  const { error } = await supabase
    .from('simulator_feedback')
    .insert({
      id,
      reference,
      user_id: user?.id ?? null,
      category: feedback.category,
      message: feedback.message,
      expected_behavior:
        feedback.expectedBehavior ?? null,
      simulator_mode: feedback.simulatorMode,
      simulator_version:
        feedback.versions.simulatorVersion ??
        null,
      engine_version:
        feedback.versions.engineVersion ?? null,
      corpus_version:
        feedback.versions.corpusVersion ?? null,
      simulation_snapshot: feedback.snapshot,
      status: 'new',
    });

  if (error) {
    console.error(
      'Failed to store simulator beta feedback',
      {
        code: error.code,
        message: error.message,
      },
    );

    return new Response(
      JSON.stringify({
        ok: false,
        error:
          'Feedback could not be stored right now.',
      }),
      {
        status: 503,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      reference,
    }),
    {
      status: 201,
      headers: {
        'content-type': 'application/json',
      },
    },
  );
};

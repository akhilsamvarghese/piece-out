import { insertParticipantRunRow } from '../lib/supabaseClient';

const MIN_TEXT_LENGTH = 2;
const MAX_TEXT_LENGTH = 120;

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function validateTextField(label, value) {
  if (value.length < MIN_TEXT_LENGTH) {
    return `${label} must be at least ${MIN_TEXT_LENGTH} characters.`;
  }

  if (value.length > MAX_TEXT_LENGTH) {
    return `${label} must be at most ${MAX_TEXT_LENGTH} characters.`;
  }

  return '';
}

export function validateParticipantIdentity({ participantName, venueName }) {
  const normalized = {
    participantName: normalizeText(participantName),
    venueName: normalizeText(venueName)
  };

  const errors = {};
  const participantNameError = validateTextField('Participant name', normalized.participantName);
  const venueNameError = validateTextField('Venue name', normalized.venueName);

  if (participantNameError) {
    errors.participantName = participantNameError;
  }

  if (venueNameError) {
    errors.venueName = venueNameError;
  }

  return {
    values: normalized,
    errors,
    isValid: Object.keys(errors).length === 0
  };
}

function toIsoTimestamp(value, label) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`${label} is invalid.`);
  }
  return timestamp.toISOString();
}

export function buildParticipantRunPayload({ participantName, venueName, startedOn, completedOn }) {
  const identity = validateParticipantIdentity({ participantName, venueName });
  if (!identity.isValid) {
    throw new Error('Participant details are invalid.');
  }

  const startedOnIso = toIsoTimestamp(startedOn, 'started_on');
  const completedOnIso = toIsoTimestamp(completedOn, 'completed_on');

  if (new Date(completedOnIso).getTime() < new Date(startedOnIso).getTime()) {
    throw new Error('completed_on must be greater than or equal to started_on.');
  }

  return {
    participant_name: identity.values.participantName,
    venue_name: identity.values.venueName,
    started_on: startedOnIso,
    completed_on: completedOnIso
  };
}

export async function insertCompletedParticipantRun(input) {
  const payload = buildParticipantRunPayload(input);
  return insertParticipantRunRow(payload);
}

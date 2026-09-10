-- Copy nango / slack / slackBot out of environmentVariables into integrationsConfig
UPDATE "OrganizationSettings"
SET "integrationsConfig" = COALESCE("integrationsConfig", '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
  'nango', CASE WHEN jsonb_typeof("environmentVariables"->'nango') = 'object' THEN "environmentVariables"->'nango' ELSE NULL END,
  'slack', CASE WHEN jsonb_typeof("environmentVariables"->'slack') = 'object' THEN "environmentVariables"->'slack' ELSE NULL END,
  'slackBot', CASE WHEN jsonb_typeof("environmentVariables"->'slackBot') = 'object' THEN "environmentVariables"->'slackBot' ELSE NULL END
))
WHERE jsonb_typeof("environmentVariables") = 'object'
  AND (
    "environmentVariables" ? 'nango'
    OR "environmentVariables" ? 'slack'
    OR "environmentVariables" ? 'slackBot'
  );

-- Keep only environment variable key/value pairs
UPDATE "OrganizationSettings"
SET "environmentVariables" = CASE
  WHEN jsonb_typeof("environmentVariables"->'vars') = 'object' THEN "environmentVariables"->'vars'
  ELSE ("environmentVariables" - 'nango' - 'slack' - 'slackBot')
END
WHERE jsonb_typeof("environmentVariables") = 'object'
  AND (
    "environmentVariables" ? 'vars'
    OR "environmentVariables" ? 'nango'
    OR "environmentVariables" ? 'slack'
    OR "environmentVariables" ? 'slackBot'
  );

-- A collaborator record must point to that collaborator's own auth account.
-- Earlier UI code accidentally stored the administrator who created the record.
UPDATE public.employees employee
SET user_id = NULL
FROM auth.users linked_user
WHERE employee.user_id = linked_user.id
  AND (
    employee.email IS NULL
    OR lower(trim(employee.email)) <> lower(trim(linked_user.email))
  );

UPDATE public.employees employee
SET user_id = auth_user.id
FROM auth.users auth_user
WHERE employee.user_id IS NULL
  AND employee.email IS NOT NULL
  AND lower(trim(employee.email)) = lower(trim(auth_user.email));

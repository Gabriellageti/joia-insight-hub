-- Remove seed templates that were auto-created
DELETE FROM template_opportunity_rules WHERE template_id = '72345961-46ff-4578-944b-10a54686fb4b';
DELETE FROM template_questions WHERE template_id = '72345961-46ff-4578-944b-10a54686fb4b';
DELETE FROM template_sections WHERE template_id = '72345961-46ff-4578-944b-10a54686fb4b';
DELETE FROM diagnostic_templates WHERE id = '72345961-46ff-4578-944b-10a54686fb4b';
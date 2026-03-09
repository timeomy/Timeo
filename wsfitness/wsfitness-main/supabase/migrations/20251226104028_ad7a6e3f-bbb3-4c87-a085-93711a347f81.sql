-- First, delete all existing exercises to start fresh with new structure
DELETE FROM exercises WHERE is_custom = false;

-- Insert PULL exercises (Back / Bicep)
INSERT INTO exercises (training_type, name, equipment, is_custom) VALUES
('PULL', 'Back Machine Row', 'Machine', false),
('PULL', 'Back Dumbbell Row (Incline Bench)', 'Dumbbell', false),
('PULL', 'Back Lat Pulldown', 'Machine', false),
('PULL', 'Back Seated Cable Row', 'Cable', false),
('PULL', 'Shoulder/Back Face Pull', 'Cable', false),
('PULL', 'Bicep Barbell Curl', 'Barbell', false),
('PULL', 'Bicep Hammer Curl', 'Dumbbell', false);

-- Insert PUSH exercises (Chest / Shoulder / Tricep)
INSERT INTO exercises (training_type, name, equipment, is_custom) VALUES
('PUSH', 'Chest Press (Machine)', 'Machine', false),
('PUSH', 'Chest Press Incline (Dumbbell)', 'Dumbbell', false),
('PUSH', 'Shoulder Seated Press (Machine)', 'Machine', false),
('PUSH', 'Lateral to Frontal Raise (Dumbbell)', 'Dumbbell', false),
('PUSH', 'Tricep Rope Push Down (Machine)', 'Machine', false),
('PUSH', 'Tricep Overhead (Dumbbell)', 'Dumbbell', false);

-- Insert LEGS exercises
INSERT INTO exercises (training_type, name, equipment, is_custom) VALUES
('LEGS', 'Leg Lunges', 'Bodyweight', false),
('LEGS', 'Leg Press', 'Machine', false),
('LEGS', 'Leg Curl', 'Machine', false),
('LEGS', 'Leg Extension', 'Machine', false),
('LEGS', 'Leg Calf Raises', 'Machine', false),
('LEGS', 'Leg Inner (Adductor)', 'Machine', false),
('LEGS', 'Leg Outer (Abductor)', 'Machine', false),
('LEGS', 'Leg Hip Thrust', 'Barbell', false),
('LEGS', 'Leg Cable Glute Kickback', 'Cable', false),
('LEGS', 'Leg Side Raises', 'Cable', false),
('LEGS', 'Leg Reverse Hyperextension', 'Machine', false),
('LEGS', 'Leg Squat', 'Barbell', false),
('LEGS', 'Leg / Back Deadlift', 'Barbell', false);
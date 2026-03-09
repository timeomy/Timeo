-- Drop existing user update policy for payment_requests
DROP POLICY IF EXISTS "Users can update pending payment requests" ON public.payment_requests;

-- Create new policy that only allows updating if status is pending_verification or rejected
CREATE POLICY "Users can update pending or rejected payment requests"
ON public.payment_requests
FOR UPDATE
USING (
  user_id = auth.uid() 
  AND status IN ('pending_verification', 'rejected')
)
WITH CHECK (
  user_id = auth.uid() 
  AND status IN ('pending_verification', 'rejected')
);
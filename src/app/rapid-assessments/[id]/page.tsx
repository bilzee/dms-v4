import { redirect } from 'next/navigation'

export default async function RapidAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/assessor/rapid-assessments/${id}`)
}


'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts'
import { RatingHistoryItem } from '@/lib/types'

export default function RatingHistory({ ratingHistory }: { ratingHistory: RatingHistoryItem[] | undefined }) {
  if (!ratingHistory || ratingHistory.length === 0) return null

  const data = ratingHistory.map(h => ({
    date: new Date(h.created_at).toLocaleDateString(),
    rating: h.new_rating,
  })).reverse()

  const minRating = Math.min(...data.map(d => d.rating))
  const maxRating = Math.max(...data.map(d => d.rating))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating History</CardTitle>
        <CardDescription>Your rating changes over time.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis domain={[minRating - 50, maxRating + 50]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="rating" stroke="#8884d8" strokeWidth={3}>
              <LabelList dataKey="rating" position="top" />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

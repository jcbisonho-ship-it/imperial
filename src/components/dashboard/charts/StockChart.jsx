import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StockChart = ({ data }) => {
  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top 10 Produtos Mais Vendidos (Geral)</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.top_products_chart} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" width={150} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                {data.top_products_chart.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(260, ${70 - index * 5}%, 60%)`} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default StockChart;
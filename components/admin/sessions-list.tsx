'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Session } from '@/lib/types';
import { Plus, MoreHorizontal, Edit, Trash2, Play, Lock, CheckCircle, Eye } from 'lucide-react';
import { CreateSessionDialog } from './create-session-dialog';
import Link from 'next/link';

interface SessionsListProps {
  sessions: Session[];
  entryCounts: Map<string, number>;
}

function getStateBadgeVariant(state: Session['state']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (state) {
    case 'DRAFT': return 'secondary';
    case 'OPEN': return 'default';
    case 'LOCKED': return 'outline';
    case 'COMPLETED': return 'destructive';
    default: return 'secondary';
  }
}

export function SessionsList({ sessions, entryCounts }: SessionsListProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleStateChange = async (sessionId: string, newState: Session['state']) => {
    setIsUpdating(sessionId);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating session:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sessions</CardTitle>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Session
          </Button>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No sessions yet. Create your first session to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Stake</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const entryCount = entryCounts.get(session.id) || 0;
                  const potAmount = entryCount * session.stake_per_player;

                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.title}</TableCell>
                      <TableCell>{formatDate(session.session_date)}</TableCell>
                      <TableCell>${session.stake_per_player.toFixed(2)}</TableCell>
                      <TableCell>
                        {entryCount} (${potAmount.toFixed(2)} pot)
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStateBadgeVariant(session.state)}>
                          {session.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isUpdating === session.id}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/sessions/${session.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/scoreboard/${session.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Scoreboard
                              </Link>
                            </DropdownMenuItem>
                            {session.state === 'DRAFT' && (
                              <DropdownMenuItem
                                onClick={() => handleStateChange(session.id, 'OPEN')}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Open for Predictions
                              </DropdownMenuItem>
                            )}
                            {session.state === 'OPEN' && (
                              <DropdownMenuItem
                                onClick={() => handleStateChange(session.id, 'LOCKED')}
                              >
                                <Lock className="mr-2 h-4 w-4" />
                                Lock Session
                              </DropdownMenuItem>
                            )}
                            {session.state === 'LOCKED' && (
                              <DropdownMenuItem
                                onClick={() => handleStateChange(session.id, 'COMPLETED')}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Completed
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(session.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateSessionDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </>
  );
}

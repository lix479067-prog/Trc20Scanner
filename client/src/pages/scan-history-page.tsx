import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { History, Clock, CheckCircle, XCircle, AlertCircle, PlayCircle, StopCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ScanSession } from "@shared/schema";

interface ScanHistoryPageProps {
  onStartNewScan?: () => void;
}

export default function ScanHistoryPage({ onStartNewScan }: ScanHistoryPageProps) {
  const { user } = useAuth();

  const { data: sessions = [], isLoading } = useQuery<ScanSession[]>({
    queryKey: ["/api/scan/sessions"],
    enabled: !!user,
  });

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (isActive && status === 'running') return <PlayCircle className="w-4 h-4 text-blue-500" />;
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    if (status === 'cancelled') return <StopCircle className="w-4 h-4 text-gray-500" />;
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
    return <AlertCircle className="w-4 h-4 text-orange-500" />;
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive && status === 'running') {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">正在运行</Badge>;
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">已完成</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">失败</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">已取消</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">等待中</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const formatTemplate = (template: string) => {
    const wildcards = template.match(/\?/g)?.length || 0;
    const fixed = template.replace(/\?/g, '*');
    return {
      display: `${fixed.slice(0, 8)}...${fixed.slice(-8)}`,
      wildcards
    };
  };

  const calculateProgress = (session: ScanSession) => {
    if (session.maxVariations === 0) return 0;
    return Math.round((session.totalScanned / session.maxVariations) * 100);
  };

  const formatDuration = (startedAt: string, completedAt?: string | null) => {
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const duration = end.getTime() - start.getTime();
    
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
    if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`;
    return `${seconds}秒`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="text-blue-500" size={20} />
            扫描历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">加载扫描记录...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="text-blue-500" size={20} />
              扫描历史记录
            </CardTitle>
            {onStartNewScan && (
              <Button onClick={onStartNewScan} size="sm">
                开始新扫描
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无扫描记录</p>
              <p className="text-sm mt-2">开始您的第一次扫描吧！</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, index) => {
            const templateInfo = formatTemplate(session.template);
            const progress = calculateProgress(session);
            const isRunning = session.isActive && session.status === 'running';
            
            return (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left side - Main info */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        {getStatusIcon(session.status, session.isActive)}
                        <div>
                          <h3 className="font-semibold">扫描任务 #{session.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(session.startedAt), { 
                              addSuffix: true, 
                              locale: zhCN 
                            })}
                          </p>
                        </div>
                        {getStatusBadge(session.status, session.isActive)}
                      </div>

                      {/* Template and settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">私钥模板：</span>
                          <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                            {templateInfo.display}
                          </code>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({templateInfo.wildcards} 个变量)
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">扫描模式：</span>
                          <span className="ml-2 font-medium">
                            {session.scanMode === 'random' ? '随机扫描' : '模板扫描'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">目标数量：</span>
                          <span className="ml-2 font-medium">{session.maxVariations.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">并行线程：</span>
                          <span className="ml-2 font-medium">{session.parallelThreads}</span>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">进度</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isRunning ? 'bg-blue-500' : 
                              session.status === 'completed' ? 'bg-green-500' : 
                              session.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {session.totalGenerated.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">已生成</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">
                            {session.totalScanned.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">已扫描</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {session.totalFound}
                          </div>
                          <div className="text-xs text-muted-foreground">发现钱包</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-orange-600">
                            {formatDuration(session.startedAt, session.completedAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.completedAt ? '总用时' : '已用时'}
                          </div>
                        </div>
                      </div>

                      {/* Error message */}
                      {session.errorMessage && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700">
                            <strong>错误：</strong> {session.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {isRunning && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 animate-pulse">
                          运行中...
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
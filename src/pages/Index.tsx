import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, Brain, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  question: string;
  answer: string;
  sources?: Array<{
    id: string;
    title: string;
    url?: string;
  }>;
  timestamp: Date;
}

const Index = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ask-anything', {
        body: { 
          question: currentQuestion,
          sessionId: crypto.randomUUID()
        }
      });

      if (error) throw error;

      const newMessage: Message = {
        id: crypto.randomUUID(),
        question: currentQuestion,
        answer: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Re:cinq Knowledge Base
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Ask me anything about Re:cinq's AI Native and Cloud Native expertise
          </p>
        </div>

        {/* Question Input */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about Re:cinq?"
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !question.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Conversation History */}
        <div className="space-y-6">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ready to help!</h3>
                <p className="text-muted-foreground">
                  Ask me about Re:cinq's services, methodologies, or anything from their knowledge base.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="text-left">
                    <h4 className="font-medium mb-2">Sample questions:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• What services does Re:cinq offer?</li>
                      <li>• How do they help with AI Native transformation?</li>
                      <li>• What is the Waves of Innovation community?</li>
                    </ul>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium mb-2">Topics covered:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Cloud Native expertise</li>
                      <li>• AI automation and workflows</li>
                      <li>• Platform engineering</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            messages.map((message) => (
              <Card key={message.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{message.question}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="max-h-96">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap">{message.answer}</p>
                    </div>
                  </ScrollArea>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                        Sources referenced:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source) => (
                          <Button
                            key={source.id}
                            variant="outline"
                            size="sm"
                            className="h-auto py-1 px-2 text-xs"
                            onClick={() => source.url && window.open(source.url, '_blank')}
                            disabled={!source.url}
                          >
                            {source.title}
                            {source.url && <ExternalLink className="h-3 w-3 ml-1" />}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;

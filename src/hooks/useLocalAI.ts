import { pipeline, env } from '@huggingface/transformers';
import { useState, useRef } from 'react';

// Configure transformers.js for browser usage
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface UseLocalAIOptions {
  onProgress?: (progress: string) => void;
}

export function useLocalAI(options?: UseLocalAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const generatorRef = useRef<any>(null);

  const initializeModel = async () => {
    if (generatorRef.current) return;
    
    try {
      setIsLoading(true);
      options?.onProgress?.('Loading AI model (this may take a minute)...');
      
      // Use the smallest available model for faster loading
      generatorRef.current = await pipeline(
        'text2text-generation',
        'Xenova/flan-t5-small',
        { 
          device: 'cpu', // Use CPU to avoid WebGPU compatibility issues
          dtype: 'q8' // Use quantized model for smaller size
        }
      );
      
      setIsInitialized(true);
      options?.onProgress?.('Model loaded successfully!');
    } catch (error) {
      console.error('Error initializing model:', error);
      options?.onProgress?.('Error loading model. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const generateResponse = async (question: string, context: string = ''): Promise<string> => {
    if (!generatorRef.current) {
      await initializeModel();
    }

    try {
      setIsLoading(true);
      
      const prompt = `You are a helpful assistant for Re:cinq, a company specializing in AI Native and Cloud Native technologies.

Context: ${context}

Question: ${question}
Answer:`;

      const result = await generatorRef.current(prompt, {
        max_new_tokens: 150,
        temperature: 0.3,
        do_sample: false, // Use greedy decoding for faster generation
      });

      return result[0]?.generated_text || "I apologize, but I couldn't generate a response at this time.";
    } catch (error) {
      console.error('Error generating response:', error);
      return "I'm having trouble generating a response right now. Please try again.";
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateResponse,
    isLoading,
    isInitialized,
    initializeModel,
  };
}
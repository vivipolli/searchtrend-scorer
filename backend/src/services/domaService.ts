import axios, { AxiosResponse } from 'axios';
import { config } from '@/config';
import logger from '@/utils/logger';
import { DomaEvent, Domain, ApiResponse } from '@/types';

interface DomaApiDomain {
  name: string;
}

class DomaService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.domaApi.baseUrl;
    this.apiKey = config.domaApi.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return this.apiKey ? { 'Api-Key': this.apiKey } : {};
  }

  /**
   * Poll for new DOMA events
   */
  async pollEvents(limit: number = 25, finalizedOnly: boolean = true): Promise<{
    events: DomaEvent[];
    lastId?: number;
    hasMoreEvents?: boolean;
  }> {
    try {
      const url = `${this.baseUrl}/v1/poll`;
      const headers = this.getHeaders();
      const params = { limit, finalizedOnly };

      logger.debug(`Polling DOMA events from ${url}`, { limit, finalizedOnly });

      const response: AxiosResponse = await axios.get(url, {
        headers,
        params,
        timeout: 30000, // 30 seconds timeout
      });

      const data = response.data || {};
      const events = Array.isArray(data.events) ? data.events : [];

      logger.info(`Successfully polled ${events.length} events from DOMA API`);

      return {
        events,
        lastId: data.lastId,
        hasMoreEvents: data.hasMoreEvents,
      };
    } catch (error) {
      logger.error('Failed to poll DOMA events:', error);
      throw new Error(`DOMA API polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Acknowledge processed events
   */
  async acknowledgeEvents(lastId: number): Promise<void> {
    try {
      const ackUrl = `${this.baseUrl}/v1/poll/ack/${lastId}`;
      const headers = this.getHeaders();

      await axios.post(ackUrl, null, {
        headers,
        timeout: 10000, // 10 seconds timeout
      });

      logger.debug(`Successfully acknowledged events up to ID: ${lastId}`);
    } catch (error) {
      logger.error(`Failed to acknowledge events for ID ${lastId}:`, error);
      // Don't throw here as acknowledgment failure shouldn't stop processing
    }
  }

  /**
   * Query domains using GraphQL API
   */
  async queryDomains(params: {
    skip?: number;
    take?: number;
    ownedBy?: string[];
    claimStatus?: 'CLAIMED' | 'UNCLAIMED' | 'ALL';
    name?: string;
    networkIds?: string[];
    tlds?: string[];
  } = {}): Promise<{
    data: Domain[];
    total: number;
  }> {
    try {
      const url = `${this.baseUrl}/graphql`;
      const headers = this.getHeaders();

      const query = `
        query GetNames(
          $skip: Int
          $take: Int
          $ownedBy: [AddressCAIP10!]
          $claimStatus: NamesQueryClaimStatus
          $name: String
          $networkIds: [String!]
          $tlds: [String!]
        ) {
          names(
            skip: $skip
            take: $take
            ownedBy: $ownedBy
            claimStatus: $claimStatus
            name: $name
            networkIds: $networkIds
            tlds: $tlds
          ) {
            items {
              name
            }
            totalCount
          }
        }
      `;

      const variables = {
        skip: params.skip || 0,
        take: params.take || 100,
        ownedBy: params.ownedBy,
        claimStatus: params.claimStatus || 'ALL',
        name: params.name,
        networkIds: params.networkIds,
        tlds: params.tlds,
      };

      logger.debug('Querying DOMA GraphQL API for domains', { variables });

      const response: AxiosResponse = await axios.post(url, {
        query,
        variables,
      }, {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const result = response.data?.data?.names;
      if (!result) {
        throw new Error('Invalid GraphQL response structure');
      }

      logger.info(`Successfully queried ${result.items.length} domains from DOMA GraphQL API`);

      // Map API response to Domain objects
      const domains: Domain[] = result.items.map((item: DomaApiDomain) => {
        const now = new Date();
        return {
          id: item.name, // Use name as ID since we don't have a separate ID field
          name: item.name,
          tokenId: undefined,
          owner: undefined,
          claimStatus: 'UNCLAIMED' as const, // Default since we don't have this info
          networkId: 'unknown', // Default since we don't have this info
          tokenAddress: undefined,
          createdAt: now,
          updatedAt: now,
        };
      });

      return {
        data: domains,
        total: result.totalCount,
      };
    } catch (error) {
      logger.error('Failed to query DOMA GraphQL API:', error);
      throw new Error(`DOMA GraphQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get domain details by name
   */
  async getDomainByName(domainName: string): Promise<Domain | null> {
    try {
      // Temporarily disable DOMA API calls to avoid blocking
      logger.warn(`DOMA API call disabled for ${domainName} - returning null`);
      return null;
      
      // const result = await this.queryDomains({
      //   name: domainName,
      //   take: 1,
      // });

      // return result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      logger.error(`Failed to get domain ${domainName}:`, error);
      return null;
    }
  }

  /**
   * Get domains by owner
   */
  async getDomainsByOwner(ownerAddress: string, limit: number = 100): Promise<Domain[]> {
    try {
      const result = await this.queryDomains({
        ownedBy: [ownerAddress],
        take: limit,
      });

      return result.data;
    } catch (error) {
      logger.error(`Failed to get domains for owner ${ownerAddress}:`, error);
      return [];
    }
  }

  /**
   * Get domains by TLD
   */
  async getDomainsByTLD(tld: string, limit: number = 100): Promise<Domain[]> {
    try {
      const result = await this.queryDomains({
        tlds: [tld],
        take: limit,
      });

      return result.data;
    } catch (error) {
      logger.error(`Failed to get domains for TLD ${tld}:`, error);
      return [];
    }
  }

  /**
   * Extract price from event data
   */
  extractPriceFromEvent(event: DomaEvent): number | null {
    try {
      const payment = event.eventData?.payment;
      if (payment && typeof payment.price === 'string') {
        const parsed = Number(payment.price);
        return !Number.isNaN(parsed) ? parsed : null;
      }
      return null;
    } catch (error) {
      logger.warn(`Failed to extract price from event ${event.id}:`, error);
      return null;
    }
  }

  /**
   * Extract network ID from event data
   */
  extractNetworkIdFromEvent(event: DomaEvent): string | null {
    return event.eventData?.networkId || null;
  }

  /**
   * Extract token address from event data
   */
  extractTokenAddressFromEvent(event: DomaEvent): string | null {
    return event.eventData?.tokenAddress || null;
  }

  /**
   * Extract token ID from event data
   */
  extractTokenIdFromEvent(event: DomaEvent): string | null {
    return event.eventData?.tokenId || null;
  }

  /**
   * Health check for DOMA API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.queryDomains({ take: 1 });
      return true;
    } catch (error) {
      logger.error('DOMA API health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const domaService = new DomaService();
export default domaService;

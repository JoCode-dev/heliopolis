import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagingService } from './messaging.service.js';
import { MessagingGateway } from './messaging.gateway.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { CreateGroupDto } from './dto/create-group.dto.js';
import { EditMessageDto } from './dto/edit-message.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/types/auth-user.js';

@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private gateway: MessagingGateway,
  ) {}

  @Get('conversations')
  getMyConversations(@CurrentUser() user: AuthUser) {
    return this.messagingService.getMyConversations(user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('since') since?: string,
    @Query('last') last?: string,
  ) {
    return this.messagingService.getMessages(id, user.id, page ? +page : 1, 50, since, last ? +last : undefined);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.messagingService.sendMessage(id, user.id, dto);
    this.gateway.broadcastMessage(id, message);
    return message;
  }

  @Post('conversations/:id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.markRead(id, user.id);
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.getConversationDetails(id, user.id);
  }

  @Post('conversations/:id/members')
  addMember(
    @Param('id') id: string,
    @Body('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.addMember(id, targetUserId, user.id);
  }

  @Delete('conversations/:id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.removeMember(id, targetUserId, user.id);
  }

  @Patch('conversations/:id/members/:userId/restrict')
  restrictWrite(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.restrictWrite(id, targetUserId, user.id);
  }

  @Patch('conversations/:id/pin')
  togglePin(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.togglePin(id, user.id);
  }

  @Delete('conversations/:id')
  archiveConversation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messagingService.archiveConversation(id, user.id);
  }

  @Post('conversations/group')
  createGroup(
    @Body() dto: CreateGroupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.createGroupConversation(user.id, dto);
  }

  @Get('conversations/channels/suggestions')
  getSuggestedChannels(@CurrentUser() user: AuthUser) {
    return this.messagingService.getSuggestedChannels(user);
  }

  @Post('conversations/:conversationId/sync-members')
  syncMembers(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.syncConversationMembers(conversationId, user.id);
  }

  @Post('conversations/channel')
  createOrJoinChannel(
    @Body('channelKey') channelKey: 'PAROISSE' | 'DOYENNE' | 'REGION' | 'GARDIENS' | 'GUIDES' | 'SENTINELLES' | 'DIFFUSION',
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.createOrJoinTerritoryChannel(user, channelKey);
  }

  @Patch('messages/:messageId')
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.messagingService.editMessage(messageId, user.id, dto.contenu);
    this.gateway.broadcastEdit(message.conversationId, message);
    return message;
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const message = await this.messagingService.deleteMessage(messageId, user.id);
    this.gateway.broadcastDelete(message.conversationId, message.id);
    return message;
  }

  @Post('conversations/private')
  createPrivate(
    @Body('userId') targetId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.createPrivateConversation(user.id, targetId);
  }

  @Get('search')
  searchMessages(
    @Query('q') query: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagingService.searchMessages(query ?? '', user.id);
  }
}
